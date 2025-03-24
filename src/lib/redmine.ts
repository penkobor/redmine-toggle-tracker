import { fetchJSON, validateAndAdjustRedmineUrl } from "./helpers";
import { createBasicAuth, RedmineAuth } from "./auth";
import { getActivityId } from "./activities";
import { askQuestion } from "./questions";
import { ModelsTimeEntry as TogglTimeEntry } from "../api-toggl";
import { createIssue, createTimeEntry, getIssues, getProjects, getTimeEntries, getTrackers, IssueSimple, TimeEntry as RedmineTimeEntry, deleteTimeEntry as redmineDeleteTimeEntry, search, Search } from "../api-redmine";
import { Client } from "@hey-api/client-fetch";
import { create } from "domain";

// Redmine un-official OpenAPI does define the TimeEntry model but it is used only for responses (?)
// And the call `createTimeEntry` parameter defines slightly different structure (inline, anonymous)
// (issue_id -> issue.id, activity_id -> activity) and for some reason wraps it in an additional time_entry "hash" (as the doc calls it)
interface RedmineEntry {
  time_entry: {
    issue_id: number;
    hours: number;
    spent_on: string;
    comments: string;
    activity_id: number;
  };
}
interface Project {
  id: number;
  name: string;
}

// Function to fetch all projects from Redmine
async function fetchAllProjects(redmineClient: Client): Promise<Project[]> {

  let allProjects: Project[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    try {
      const response = await getProjects({
        client: redmineClient,
        path: { format: "json" },
        query: { limit, offset }
      })
      if(response.error) {
        throw new Error(`HTTP error: ${response.error}`);
      }

      const projects: Project[] = response.data!.projects

      if (projects.length === 0) {
        // No more projects to fetch
        break;
      }

      allProjects = allProjects.concat(projects);

      // Update offset for the next batch
      offset += limit;

      // Check if we've fetched all projects
      if (allProjects.length >= response.data!.total_count!) {
        // All projects fetched
        break;
      }
    } catch (error: any) {
      console.error("Failed to fetch projects from Redmine:", error.message);
      console.error("🔍 Error details:", {
        redmineClient,
        offset,
        limit
      });
      throw error;
    }
  }
  return allProjects;
}

function getTrackerId(trackerName: string): number {
  const trackersMap: { [key: string]: number } = {
    Task: 5,
    Bug: 1,
  };
  return trackersMap[trackerName] || 5; // Default to Task if not found
}

async function createTask(
  redmineClient: Client,
  taskName: string,
  projectName: string
): Promise<void> {
  try {
    const allProjects = await fetchAllProjects(redmineClient);
    if (!projectName) {
      if (allProjects.length === 0) {
        console.log("No projects found in Redmine.");
        return;
      }
      // Display projects to the user
      console.log("\nAvailable projects:\n");
      allProjects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
      });

      const projectIndex = await askQuestion(
        "\nEnter the number of the project where the task should be created: ",
        (answer) => {
          const idx = parseInt(answer) - 1;
          if (isNaN(idx) || idx < 0 || idx >= allProjects.length) {
            throw new Error("Invalid project selection.");
          }
          return idx;
        }
      );
      const projectFromSelection = allProjects[projectIndex];

      if (projectFromSelection) {
        proceedToCreateIssue(projectFromSelection);
      }
    }

    const selectedProject = allProjects.find((p) => p.name === projectName);
    if (!selectedProject) {
      console.log(`Project "${projectName}" not found.`);
      return;
    }
    proceedToCreateIssue(selectedProject);

    async function proceedToCreateIssue(selectedProject: Project) {
      // Prompt for tracker type
      const trackers = ["Task", "Bug"];
      console.log("\nAvailable trackers:\n");
      trackers.forEach((tracker, index) => {
        console.log(`${index + 1}. ${tracker}`);
      });

      const trackerIndex = await askQuestion(
        "\nEnter the number of the tracker type: ",
        (answer) => {
          const index = parseInt(answer) - 1;
          if (isNaN(index) || index < 0 || index >= trackers.length) {
            throw new Error("Invalid tracker selection.");
          }
          return index;
        }
      );
      const selectedTracker = trackers[trackerIndex];

      const description: string = await askQuestion(
        "\nEnter the description of the task (optional): "
      );

      const issueData = {
        issue: {
          project_id: selectedProject.id,
          subject: taskName,
          tracker_id: getTrackerId(selectedTracker),
          description: description,
        },
      };

      try {
        const response = await createIssue({
          client: redmineClient,
          path: { format: "json" },
          body: issueData
        });
        if(response.error) {
          console.error("Failed to create issue:", response.error);
          console.error("🔍 Error details:", {
            issueData,
            redmineClient
          });
        } else {
          console.log(`\nIssue created successfully with ID #${response.data!.issue!.id}.`);
        }
      } catch (err: any) {
        console.error("❌ Error creating issue:", err.message);
        console.error("🔍 Error details:", {
          issueData,
          redmineClient
        });
      }
    }
  } catch (error: any) {
    console.error("❌ Error fetching projects:", error.message);
    console.error("🔍 Error details:", {
      taskName,
      projectName,
      redmineClient
    });
  }
}

const LOG_PRECISELY = "lp";
let isEntryLoggedPrecisely: (entry: TogglTimeEntry) => boolean = (entry) => {
  return entry.description!.includes(`@${LOG_PRECISELY}`) || entry.tags!.includes(LOG_PRECISELY);
}

function prepareRedmineEntries(
  togglEntries: TogglTimeEntry[],
  requiredHoursCap: number
): RedmineEntry[] {
  const adjustCoefficient = (requiredHoursCap == 0) ? 1 : (function(): number {
    const workedDurationSeconds = togglEntries.reduce(
      (sum, entry) => sum + entry.duration!,
      0
    );
    const workedDurationHours = workedDurationSeconds / 3600;
  
    const preciseDurationSeconds = togglEntries.filter(isEntryLoggedPrecisely).reduce(
      (sum, entry) => sum + entry.duration!,
      0
    );
    const preciseDurationHours = preciseDurationSeconds / 3600;
  
    const adjustableDurationHours = workedDurationHours - preciseDurationHours;
    return (requiredHoursCap - preciseDurationHours) / adjustableDurationHours || 1;
  })();

  let redmineEntries: RedmineEntry[] = [];

  togglEntries.forEach((entry) => {
    const description = entry.description || "";
    const durationSeconds = entry.duration!;
    const spentOn = entry.start!.substring(0, 10);

    const issueIdMatch = description.match(/#(\d+)/);
    const issueId = issueIdMatch ? issueIdMatch[1] : null;

    const adjustedDurationHours =
      (durationSeconds / 3600) * (isEntryLoggedPrecisely(entry) ? 1 : adjustCoefficient);

    const comments = description
      .replace(/#[0-9]+/, "")
      .replace(`@${LOG_PRECISELY}`, "")
      .trim();

    const activityId = getActivityId(description, entry.tags!);

    if (issueId) {
      redmineEntries.push({
        time_entry: {
          issue_id: Number(issueId),
          hours: Math.round(adjustedDurationHours * 100) / 100,
          spent_on: spentOn,
          comments: comments.charAt(0).toUpperCase() + comments.slice(1),
          activity_id: activityId,
        },
      });
    }
  });

  return redmineEntries;
}

async function trackTimeInRedmine(
  redmineClient: Client,
  redmineEntries: RedmineEntry[],
): Promise<void> {

  for (const entry of redmineEntries) {
    const response = await createTimeEntry({
      client: redmineClient,
      path: { format: "json" },
      body: entry
    })
    if(response.error) {
      console.error(
        `Failed to track time for issue #${entry.time_entry.issue_id}:`, response.error
      );
      console.error("🔍 Error details:", {
        entry,
        redmineClient
      });
    } else {
      const createdEntry = response.data.time_entry;
      console.log(
        `#${createdEntry.issue!.id}: ${createdEntry.hours}h tracked in Redmine as id ${createdEntry.id}.`
      );  
    }
  }
}

// Function to search issues using the standard Redmine API
async function searchIssues(
  redmineClient: Client,
  searchQuery: string
): Promise<Search[]> {
  try {
    const response = await search({
      client: redmineClient,
      path: { format: "json" },
      query: { offset: 0, limit: 20, q: searchQuery }
    })
    if(response.error) {
      throw new Error(`HTTP error: ${response.error}`);
    }
    return response.data!.results;
  } catch (err) {
    console.error("Failed to search issues:", err);
    console.error("🔍 Error details:", {
      redmineClient,
      searchQuery
    });
    return [];
  }
}

// Function to fetch the user's tracked time entries from Redmine
async function fetchUserTimeEntries(
  redmineClient: Client,
  date: string
): Promise<RedmineTimeEntry[]> {

  const response = await getTimeEntries({
    client: redmineClient,
    path: { format: "json" },
    query: { user_id: ["me"], spent_on: date },

  });
  if(response.error) {
    console.error("Failed to fetch time entries:", response.error);
    console.error("🔍 Error details:", {
      redmineClient,
      date
    });
    return [];
  }
  return response.data!.time_entries;
}

// Function to delete a time entry from Redmine
async function deleteTimeEntry(
  redmineClient: Client,
  entryId: number
): Promise<void> {

  try {
    const response = await redmineDeleteTimeEntry({
      client: redmineClient,
      path: { format: "json", time_entry_id: entryId }
    });
    if(response.error) {
      throw new Error(`HTTP error: ${response.error}`);
    }
    console.log(`Time entry with ID ${entryId} deleted successfully.`);
  } catch (err) {
    console.error(`Failed to delete time entry with ID ${entryId}:`, err);
    console.error("🔍 Error details:", {
      entryId,
      redmineClient
    });
  }
}

export {
  fetchAllProjects,
  createTask,
  trackTimeInRedmine,
  searchIssues,
  prepareRedmineEntries,
  fetchUserTimeEntries,
  deleteTimeEntry,
};
