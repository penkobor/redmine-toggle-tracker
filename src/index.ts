import dotenv from "dotenv";
dotenv.config();

import { askQuestion } from "./lib/questions";
import { getDateString } from "./lib/helpers";
import { fetchTogglTimeEntries } from "./lib/toggl";
import {
  createTask,
  prepareRedmineEntries,
  searchIssues,
  trackTimeInRedmine,
} from "./lib/redmine";
import { createBasicAuth } from "./lib/auth";

const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;
const defaultProjectId = process.env.DEFAULT_PROJECT!;

(async function main() {
  const [command, arg1, arg2] = process.argv.slice(2);

  const redmineAuth = {
    username: process.env.REDMINE_TOKEN!,
    password: "pass",
  };
  const redmineUrl = process.env.REDMINE_API_URL!;

  switch (command) {
    case "--help":
    case "-h":
      console.log(`
        📖 Usage: 
          🚀 create-task <taskName> <projectName> - Create a new task
          🔍 search <query> - Search for issues
          ⏱️ track-time <daysAgo> <hours> - Track time in Redmine

        ⚙️ Options:
          -h, --help  Show help
      `);
      break;

    case "create-task":
      const taskName = arg1;
      const projectName = arg2 ?? defaultProjectId;

      if (!taskName) {
        console.log("❌ Please provide a task name.");
        process.exit(1);
      }

      await createTask(taskName, projectName, redmineAuth);
      break;

    case "track-time":
      const daysAgo = arg1 ? parseInt(arg1) : 0;
      const totalHours = arg2 ? parseFloat(arg2) : 8;
      const date = getDateString(daysAgo);

      const trackConfirmation: string = await askQuestion(
        `Track ${totalHours} hours for date "${date}"? (yes/no): `
      );
      if (trackConfirmation.trim().toLowerCase() === "yes") {
        const togglAuth = {
          username: process.env.TOGGL_API_TOKEN!,
          password: "api_token",
        };

        const togglUrl = process.env.TOGGL_API_URL!;

        console.log(createBasicAuth(togglAuth));
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
      break;

    case "search":
      const searchQuery = arg1;

      if (!searchQuery) {
        console.log("❌ Please provide a search query.");
        process.exit(1);
      }

      console.log(`🔎 Searching for issues with query: "${searchQuery}"`);

      const issues = await searchIssues(searchQuery, redmineAuth, redmineUrl);

      if (issues.length > 0) {
        console.log("✅ Issues found:");
        issues.forEach((issue) => {
          console.log(`- #${issue.id}: ${issue.subject}`);
        });
      } else {
        console.log("No issues found.");
      }
      break;

    default:
      console.log("❌ Invalid command. Use --help for options.");
      break;
  }
})();
