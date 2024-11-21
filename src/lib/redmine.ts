import { fetchJSON } from "./helpers";
import { createBasicAuth, RedmineAuth } from "./auth";
import { getActivityId } from "./activities";
import { askQuestion } from "./questions";

interface TogglEntry {
  description: string;
  duration: number;
  start: string;
}

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
async function fetchAllProjects(redmineAuth: RedmineAuth): Promise<Project[]> {
  const redmineApiKey = redmineAuth.username; // Replace with your actual API key
  const redmineProjectsUrl = "https://redmine.sabo-gmbh.de/projects.json";

  let allProjects: Project[] = [];
  let offset = 0;
  const limit = 100;

  // Prepare the Basic Auth header
  const authString = btoa(`${redmineApiKey}:pass`); // 'pass' can be any string
  const headers = new Headers({
    Authorization: `Basic ${authString}`,
    "Content-Type": "application/json",
  });

  while (true) {
    const url = new URL(redmineProjectsUrl);
    url.searchParams.append("limit", limit.toString());
    url.searchParams.append("offset", offset.toString());

    try {
      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const projects: Project[] = data.projects;

      if (projects.length === 0) {
        // No more projects to fetch
        break;
      }

      allProjects = allProjects.concat(projects);

      // Update offset for the next batch
      offset += limit;

      // Check if we've fetched all projects
      if (allProjects.length >= data.total_count) {
        // All projects fetched
        break;
      }
    } catch (error) {
      console.error("Failed to fetch projects from Redmine:", error);
      throw error;
    }
  }

  return allProjects;
}

function getTrackerId(trackerName) {
  const trackersMap = {
    Task: 5,
    Bug: 1,
  };
  return trackersMap[trackerName] || 5; // Default to Task if not found
}

async function createTask(
  taskName: string,
  projectName: string,
  redmineAuth: RedmineAuth
): Promise<void> {
  const allProjects = await fetchAllProjects(redmineAuth);
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

  async function proceedToCreateIssue(selectedProject) {
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

    const description = await askQuestion(
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

    const basicString = Object.values(redmineAuth)
      .map((value) => value)
      .join(":");

    try {
      const { issue } = await fetchJSON(
        "https://redmine.sabo-gmbh.de/issues.json",
        {
          method: "POST",
          headers: {
            Authorization: createBasicAuth(redmineAuth),
          },
          body: JSON.stringify(issueData),
        }
      );
      console.log(`\nIssue created successfully with ID #${issue.id}`);
    } catch (err) {
      console.log(err);
    }
  }
}

function prepareRedmineEntries(
  togglEntries: TogglEntry[],
  totalHours: number
): RedmineEntry[] {
  const LOG_PRECISELY = "@lp";
  const totalDurationSeconds = togglEntries.reduce(
    (sum, entry) => sum + entry.duration,
    0
  );
  const totalDurationHours = totalDurationSeconds / 3600;

  const preciseEntries = togglEntries.filter((entry) =>
    entry.description.includes(LOG_PRECISELY)
  );
  const preciseDurationSeconds = preciseEntries.reduce(
    (sum, entry) => sum + entry.duration,
    0
  );
  const preciseDurationHours = preciseDurationSeconds / 3600;

  const adjustableDurationHours = totalDurationHours - preciseDurationHours;
  const adjustCoefficient =
    (totalHours - preciseDurationHours) / adjustableDurationHours || 1;

  const redmineEntries: {
    time_entry: {
      issue_id: number;
      hours: number;
      spent_on: string;
      comments: string;
      activity_id: number;
    };
  }[] = [];

  togglEntries.forEach((entry) => {
    const description = entry.description || "";
    const durationSeconds = entry.duration;
    const spentOn = entry.start.substring(0, 10);

    const issueIdMatch = description.match(/#(\d+)/);
    const issueId = issueIdMatch ? issueIdMatch[1] : null;

    const shouldLogPrecisely = description.includes(LOG_PRECISELY);
    const adjustedDurationHours =
      (durationSeconds / 3600) * (shouldLogPrecisely ? 1 : adjustCoefficient);

    const comments = description
      .replace(/#[0-9]+/, "")
      .replace(LOG_PRECISELY, "")
      .trim();

    const activityId = getActivityId(description);

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
  redmineEntries: RedmineEntry[],
  redmineAuth: RedmineAuth,
  redmineUrl: string
): Promise<void> {
  const redmineTimeEntriesUrl = `${redmineUrl}/time_entries.json`;

  for (const entry of redmineEntries) {
    try {
      const response = await fetchJSON(redmineTimeEntriesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createBasicAuth(redmineAuth),
        },
        body: JSON.stringify(entry),
      });
      console.log(
        `#${entry.time_entry.issue_id}: ${entry.time_entry.hours}h tracked in Redmine.`
      );
    } catch (error) {
      console.error(
        `Failed to track time for issue #${entry.time_entry.issue_id}:`,
        error.message
      );
    }
  }
}

async function searchIssues(
  searchQuery: string,
  redmineAuth: RedmineAuth
): Promise<any[]> {
  const encodedQuery = encodeURIComponent(searchQuery);
  const url =
    `${"https://redmine-lite.netlify.app/api"}/issues.json?` +
    `offset=0&limit=20&` +
    `f[]=subject&op[subject]=~&v[subject][]=${encodedQuery}` +
    `&sort=updated_on:desc`;

  try {
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(redmineAuth),
      },
    });
    return response.issues;
  } catch (err) {
    console.error("Failed to search issues:", err);
    return [];
  }
}

export {
  fetchAllProjects,
  createTask,
  trackTimeInRedmine,
  searchIssues,
  prepareRedmineEntries,
};
