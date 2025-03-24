import { askQuestion } from "./questions";
import { getDateString } from "./helpers";
import {
  createTask as createRedmineTask,
  prepareRedmineEntries,
  searchIssues,
  trackTimeInRedmine,
  fetchUserTimeEntries,
  deleteTimeEntry,
} from "./redmine";
import { fetchTogglTimeEntries } from "./toggl";
import { Client } from "@hey-api/client-fetch";
import { Search } from "../api-redmine";

// Function to show help information
export async function showHelp() {
  console.log(`
    📖 Usage: 
      🚀 create-task <taskName> <projectName> - Create a new task
      🔍 search <query> - Search for issues
      ⏱️  toggle <daysAgo> <hours> - Import time entries from Toggle to Redmine
      ⏱️  track <issueID> <hours> <comment> <daysAgo> - Track hours directly to a task in Redmine
      📅 get-entries <daysAgo> - Fetch and print your tracked time entries in Redmine
      ❌ delete <daysAgo> - Delete a time entry for a specific day
      📅 print-monthly-summary - Print a summary of your tracked hours for the current

    ⚙️  Options:
      -h, --help  Show help
  `);
}

// Function to handle 'create-task' command
export async function createTaskCommand(
  redmineClient: Client,
  taskName: string,
  projectName: string
) {
  if (!taskName) {
    console.log("❌ Error: Task name is missing. Please provide a task name.");
    process.exit(1);
  }

  try {
    await createRedmineTask(redmineClient, taskName, projectName);
  } catch (error: any) {
    console.error("❌ Error creating task:", error.message);
    console.error("🔍 Error details:", {
      taskName,
      projectName,
      redmineClient,
    });
    process.exit(1);
  }
}

// Function to handle 'toggle' command
export async function trackTimeCommand(props: {
  redmineClient: Client,
  togglClient: Client,
  daysAgo: number;
  totalHours: number;
  togglWorkspaceId: string;
}) {
  const {
    redmineClient,
    togglClient,
    daysAgo,
    totalHours,
    togglWorkspaceId
  } = props;
  const date = getDateString(daysAgo);

  const trackConfirmation: string = await askQuestion(
    `Track ${totalHours} hours for date "${date}"? (yes/no): `
  );
  if (trackConfirmation.trim().toLowerCase() === "yes") {
    try {
      const togglEntries = await fetchTogglTimeEntries(
        togglClient,
        date,
        togglWorkspaceId
      );

      const redmineEntries = prepareRedmineEntries(togglEntries, totalHours);

      console.log("\n⏳ Time entries to be tracked in Redmine:\n");
      redmineEntries.forEach((entry) => {
        console.log(
          `⏱️  Issue #${entry.time_entry.issue_id}: ${entry.time_entry.spent_on} ${entry.time_entry.hours}h ${entry.time_entry.activity_id} ${entry.time_entry.comments}`
        );
      });

      const proceed: string = await askQuestion(
        "\nDo you want to proceed with tracking these time entries in Redmine? (yes/no): "
      );

      if (proceed.trim().toLowerCase() === "yes") {
        await trackTimeInRedmine(redmineClient, redmineEntries);
        console.log("✅ Time tracked successfully.");
      } else {
        console.log("🚫 Time tracking aborted.");
      }
    } catch (error: any) {
      console.error("❌ Error tracking time:", error.message);
      console.error("🔍 Error details:", {
        daysAgo,
        totalHours,
        redmineClient,
        togglClient,
        togglWorkspaceId,
      });
      process.exit(1);
    }
  } else {
    console.log("🚫 Time tracking aborted.");
  }
}

// Function to handle 'track' command
export async function trackTaskCommand(
  redmineClient: Client,
  issueID: string,
  hours: number,
  comment: string,
  daysAgo: number
) {
  if (!issueID || !hours) {
    console.log("❌ Error: Issue ID and hours are required.");
    process.exit(1);
  }

  const trackConfirmation: string = await askQuestion(
    `Track ${hours} hours to issue #${issueID} with comment "${comment}"? (yes/no): `
  );
  if (trackConfirmation.trim().toLowerCase() === "yes") {
    try {
      const redmineEntry = {
        time_entry: {
          issue_id: Number(issueID),
          hours: Math.round(hours * 100) / 100,
          spent_on: getDateString(daysAgo),
          comments: comment,
          activity_id: 9, // Assuming 9 is the default activity ID
        },
      };

      await trackTimeInRedmine(redmineClient, [redmineEntry]);
      console.log("✅ Time tracked successfully.");
    } catch (error: any) {
      console.error("❌ Error tracking time:", error.message);
      console.error("🔍 Error details:", {
        issueID,
        hours,
        comment,
        daysAgo,
        redmineClient
      });
      process.exit(1);
    }
  } else {
    console.log("🚫 Time tracking aborted.");
  }
}

// Function to handle 'search' command
export async function searchCommand(
  redmineClient: Client,
  searchQuery: string
) {
  if (!searchQuery) {
    console.log(
      "❌ Error: Search query is missing. Please provide a search query."
    );
    process.exit(1);
  }

  console.log(`🔎 Searching for issues with query: "${searchQuery}"`);

  try {
    const issues: Search[] = await searchIssues(redmineClient, searchQuery);

    if (issues.length > 0) {
      console.log("✅ Issues found:");
      issues.forEach((issue) => {
        console.log(`- #${issue.id}: ${issue.title}`);
      });
    } else {
      console.log("No issues found.");
    }
  } catch (error: any) {
    console.error("❌ Error searching issues:", error.message);
    console.error("🔍 Error details:", {
      searchQuery,
      redmineClient
    });
    process.exit(1);
  }
}

// Function to handle 'get-entries' command
export async function getEntriesCommand(
  redmineClient: Client,
  daysAgo: number,
) {
  const date = getDateString(daysAgo);

  try {
    const entries = await fetchUserTimeEntries(redmineClient, date);

    if (entries.length > 0) {
      console.log(`✅ Time entries for ${date}:`);
      let totalHours = 0;
      entries.forEach((entry) => {
        console.log(
          `- Issue #${entry.issue!.id}: ${entry.hours}h - ${entry.comments}`
        );
        totalHours += entry.hours;
      });
      console.log(`\nTotal hours tracked: ${totalHours}h`);
    } else {
      console.log(`No time entries found for ${date}.`);
    }
  } catch (error: any) {
    console.error("❌ Error fetching time entries:", error.message);
    console.error("🔍 Error details:", {
      daysAgo,
      redmineClient,
    });
    process.exit(1);
  }
}

// Function to handle 'delete' command
export async function deleteEntryCommand(
  redmineClient: Client,
  daysAgo: number
) {
  const date = getDateString(daysAgo);

  try {
    const entries = await fetchUserTimeEntries(redmineClient, date);

    if (entries.length > 0) {
      console.log(`✅ Time entries for ${date}:`);
      entries.forEach((entry) => {
        console.log(
          `- ID: ${entry.id}, Issue #${entry.issue!.id}: ${entry.hours}h - ${entry.comments}`
        );
      });

      const entryIdToDelete: number = await askQuestion(
        "\nEnter the ID of the entry you want to delete: ",
        (answer) => {
          const id = parseInt(answer);
          if (isNaN(id)) {
            throw new Error("Invalid entry ID.");
          }
          return id;
        }
      );

      const deleteConfirmation: string = await askQuestion(
        `Are you sure you want to delete entry ID ${entryIdToDelete}? (yes/no): `
      );

      if (deleteConfirmation.trim().toLowerCase() === "yes") {
        await deleteTimeEntry(redmineClient, entryIdToDelete);
        console.log("✅ Time entry deleted successfully.");
      } else {
        console.log("🚫 Deletion aborted.");
      }
    } else {
      console.log(`No time entries found for ${date}.`);
    }
  } catch (error: any) {
    console.error("❌ Error deleting time entry:", error.message);
    console.error("🔍 Error details:", {
      daysAgo,
      redmineClient
    });
    process.exit(1);
  }
}

// Function to handle 'print-monthly-summary' command
export async function printMonthlySummaryCommand(redmineClient: Client) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= today.getDate(); day++) {
    // Adjust day to fix offset
    const date = new Date(year, month, day);

    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    date.setDate(date.getDate() + 1);
    const dateString = date.toISOString().split("T")[0];

    try {
      const entries = await fetchUserTimeEntries(redmineClient, dateString);

      let totalHours = 0;
      entries.forEach((entry) => {
        totalHours += entry.hours;
      });

      console.log(
        `${dateString} ${`(${dayName}):`.padEnd(15)} ${Math.round(
          totalHours
        )}h. ${(() => {
          if (
            dayName.toLowerCase() === "saturday" ||
            dayName.toLowerCase() === "sunday"
          ) {
            return "💤";
          }
          return totalHours >= 7.5 ? "✔️" : "⚠️";
        })()}`
      );
    } catch (error: any) {
      console.error("❌ Error fetching time entries:", error.message);
      console.error("🔍 Error details:", {
        dateString,
        redmineClient,
      });
    }
  }
}
