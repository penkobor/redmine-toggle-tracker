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
      ⏱️  track-time <daysAgo> <hours> - Track time in Redmine

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
    console.log("❌ Please provide a task name.");
    process.exit(1);
  }

  await createRedmineTask(taskName, projectName, redmineAuth);
}

// Function to handle 'track-time' command
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
    console.log("❌ Please provide a search query.");
    process.exit(1);
  }

  console.log(`🔎 Searching for issues with query: "${searchQuery}"`);

  const issues = await searchIssues(searchQuery, redmineAuth);

  if (issues.length > 0) {
    console.log("✅ Issues found:");
    issues.forEach((issue) => {
      console.log(`- #${issue.id}: ${issue.subject}`);
    });
  } else {
    console.log("No issues found.");
  }
}
