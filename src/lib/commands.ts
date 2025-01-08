import { askQuestion } from "./questions";
import { getDateString } from "./helpers";
import {
  createTask as createRedmineTask,
  prepareRedmineEntries,
  searchIssues,
  trackTimeInRedmine,
} from "./redmine";
import { fetchTogglTimeEntries } from "./toggl";

// Function to show help information
export async function showHelp() {
  console.log(`
    📖 Usage: 
      🚀 create-task <taskName> <projectName> - Create a new task
      🔍 search <query> - Search for issues
      ⏱️  toggle <daysAgo> <hours> - Import time entries from Toggle to Redmine
      ⏱️  track <issueID> <hours> <comment> - Track hours directly to a task in Redmine

    ⚙️  Options:
      -h, --help  Show help
  `);
}

// Function to handle 'create-task' command
export async function createTaskCommand(
  taskName: string,
  projectName: string,
  redmineAuth: { username: string; password: string }
) {
  if (!taskName) {
    console.log("❌ Error: Task name is missing. Please provide a task name.");
    process.exit(1);
  }

  try {
    await createRedmineTask(taskName, projectName, redmineAuth);
  } catch (error: any) {
    console.error("❌ Error creating task:", error.message);
    console.error("🔍 Error details:", {
      taskName,
      projectName,
      redmineAuth,
    });
    process.exit(1);
  }
}

// Function to handle 'toggle' command
export async function trackTimeCommand(props: {
  daysAgo: number;
  totalHours: number;
  redmineAuth: { username: string; password: string };
  redmineUrl: string;
  togglAuth: { username: string; password: string };
  togglUrl: string;
  togglWorkspaceId: string;
}) {
  const {
    daysAgo,
    totalHours,
    redmineAuth,
    redmineUrl,
    togglAuth,
    togglUrl,
    togglWorkspaceId,
  } = props;
  const date = getDateString(daysAgo);

  const trackConfirmation: string = await askQuestion(
    `Track ${totalHours} hours for date "${date}"? (yes/no): `
  );
  if (trackConfirmation.trim().toLowerCase() === "yes") {
    try {
      const togglEntries = await fetchTogglTimeEntries(
        togglAuth,
        togglUrl,
        date,
        togglWorkspaceId
      );

      const redmineEntries = prepareRedmineEntries(togglEntries, totalHours);

      console.log("\n⏳ Time entries to be tracked in Redmine:\n");
      redmineEntries.forEach((entry) => {
        console.log(
          `⏱️  Issue #${entry.time_entry.issue_id}: ${entry.time_entry.hours}h - ${entry.time_entry.comments}`
        );
      });

      const proceed: string = await askQuestion(
        "\nDo you want to proceed with tracking these time entries in Redmine? (yes/no): "
      );

      if (proceed.trim().toLowerCase() === "yes") {
        await trackTimeInRedmine(redmineEntries, redmineAuth, redmineUrl);
        console.log("✅ Time tracked successfully.");
      } else {
        console.log("🚫 Time tracking aborted.");
      }
    } catch (error: any) {
      console.error("❌ Error tracking time:", error.message);
      console.error("🔍 Error details:", {
        daysAgo,
        totalHours,
        redmineAuth,
        redmineUrl,
        togglAuth,
        togglUrl,
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
  issueID: string,
  hours: number,
  comment: string,
  redmineAuth: { username: string; password: string },
  redmineUrl: string
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
          spent_on: new Date().toISOString().split("T")[0],
          comments: comment,
          activity_id: 9, // Assuming 9 is the default activity ID
        },
      };

      await trackTimeInRedmine([redmineEntry], redmineAuth, redmineUrl);
      console.log("✅ Time tracked successfully.");
    } catch (error: any) {
      console.error("❌ Error tracking time:", error.message);
      console.error("🔍 Error details:", {
        issueID,
        hours,
        comment,
        redmineAuth,
        redmineUrl,
      });
      process.exit(1);
    }
  } else {
    console.log("🚫 Time tracking aborted.");
  }
}

// Function to handle 'search' command
export async function searchCommand(
  searchQuery: string,
  redmineAuth: { username: string; password: string }
) {
  if (!searchQuery) {
    console.log(
      "❌ Error: Search query is missing. Please provide a search query."
    );
    process.exit(1);
  }

  console.log(`🔎 Searching for issues with query: "${searchQuery}"`);

  try {
    const issues = await searchIssues(searchQuery, redmineAuth);

    if (issues.length > 0) {
      console.log("✅ Issues found:");
      issues.forEach((issue) => {
        console.log(`- #${issue.id}: ${issue.subject}`);
      });
    } else {
      console.log("No issues found.");
    }
  } catch (error: any) {
    console.error("❌ Error searching issues:", error.message);
    console.error("🔍 Error details:", {
      searchQuery,
      redmineAuth,
    });
    process.exit(1);
  }
}
