import { fetchJSON, validateAndAdjustRedmineUrl } from "./helpers.js";
import { createBasicAuth, RedmineAuth } from "./auth.js";
import { getActivityId } from "./activities.js";
import { askQuestion } from "./questions.js";
import { TogglEntry } from "./toggl.js";

export interface RedmineEntry {
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
  const redmineProjectsUrl = `${validateAndAdjustRedmineUrl(
    process.env.REDMINE_API_URL!
  )}projects.json`;

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
    } catch (error: any) {
      console.error("Failed to fetch projects from Redmine:", error.message);
      console.error("🔍 Error details:", {
        redmineProjectsUrl,
        offset,
        limit,
        headers,
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

const LOG_PRECISELY = "lp";
let isEntryLoggedPrecisely: (entry: TogglEntry) => boolean = (entry) => {
  return (
    entry.description.includes(`@${LOG_PRECISELY}`) ||
    entry.tags.includes(LOG_PRECISELY)
  );
};

function prepareRedmineEntries(
  togglEntries: TogglEntry[],
  requiredHoursCap: number
): RedmineEntry[] {
  const adjustCoefficient =
    requiredHoursCap == 0
      ? 1
      : (function (): number {
          const workedDurationSeconds = togglEntries.reduce(
            (sum, entry) => sum + entry.duration,
            0
          );
          const workedDurationHours = workedDurationSeconds / 3600;

          const preciseDurationSeconds = togglEntries
            .filter(isEntryLoggedPrecisely)
            .reduce((sum, entry) => sum + entry.duration, 0);
          const preciseDurationHours = preciseDurationSeconds / 3600;

          const adjustableDurationHours =
            workedDurationHours - preciseDurationHours;
          return (
            (requiredHoursCap - preciseDurationHours) /
              adjustableDurationHours || 1
          );
        })();

  let redmineEntries: RedmineEntry[] = [];

  togglEntries.forEach((entry) => {
    const description = entry.description || "";
    const durationSeconds = entry.duration;
    const spentOn = entry.start.substring(0, 10);

    const issueIdMatch = description.match(/#(\d+)/);
    const issueId = issueIdMatch ? issueIdMatch[1] : null;

    const adjustedDurationHours =
      (durationSeconds / 3600) *
      (isEntryLoggedPrecisely(entry) ? 1 : adjustCoefficient);

    const comments = description
      .replace(/#[0-9]+/, "")
      .replace(`@${LOG_PRECISELY}`, "")
      .trim();

    const activityId = getActivityId(description, entry.tags);

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
      await fetchJSON(redmineTimeEntriesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createBasicAuth(redmineAuth),
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.error(
        `Failed to track time for issue #${entry.time_entry.issue_id}:`,
        (error as Error).message
      );
      console.error("🔍 Error details:", {
        entry,
        redmineAuth,
        redmineUrl,
      });
    }
  }
}

// Function to search issues using the standard Redmine API
async function searchIssues(
  searchQuery: string,
  redmineAuth: RedmineAuth
): Promise<any[]> {
  const encodedQuery = encodeURIComponent(searchQuery);
  const url =
    `${validateAndAdjustRedmineUrl(process.env.REDMINE_API_URL!)}issues.json?` +
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
    console.error("🔍 Error details:", {
      searchQuery,
      redmineAuth,
      url,
    });
    return [];
  }
}

// Function to fetch the user's tracked time entries from Redmine
async function fetchUserTimeEntries(
  redmineAuth: RedmineAuth,
  date: string
): Promise<any[]> {
  const url =
    `${validateAndAdjustRedmineUrl(
      process.env.REDMINE_API_URL!
    )}time_entries.json?` + `user_id=me&spent_on=${date}`;

  try {
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(redmineAuth),
      },
    });
    return response.time_entries;
  } catch (err) {
    console.error("Failed to fetch time entries:", err);
    console.error("🔍 Error details:", {
      date,
      redmineAuth,
      url,
    });
    return [];
  }
}

// Function to delete a time entry from Redmine
async function deleteTimeEntry(entryId: number, redmineAuth: RedmineAuth) {
  const url = `${validateAndAdjustRedmineUrl(
    process.env.REDMINE_API_URL!
  )}time_entries/${entryId}.json`;
  return fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: createBasicAuth(redmineAuth),
    },
  });
}

export {
  fetchAllProjects,
  trackTimeInRedmine,
  searchIssues,
  prepareRedmineEntries,
  fetchUserTimeEntries,
  deleteTimeEntry,
};
