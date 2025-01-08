#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { validateAndAdjustRedmineUrl } from "./lib/helpers";
import { trackTaskCommand } from "./lib/commands";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

import {
  showHelp,
  createTaskCommand,
  trackTimeCommand,
  searchCommand,
} from "./lib/commands";

(async function main() {
  try {
    const [command, arg1, arg2, arg3] = process.argv.slice(2);

    const redmineAuth = {
      username: process.env.REDMINE_TOKEN!,
      password: "pass",
    };
    const redmineUrl = validateAndAdjustRedmineUrl(
      process.env.REDMINE_API_URL!
    );

    const togglAuth = {
      username: process.env.TOGGL_API_TOKEN!,
      password: "api_token",
    };
    const togglUrl = process.env.TOGGL_API_URL!;

    const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;
    const defaultProjectId = process.env.DEFAULT_PROJECT!;

    if (
      !process.env.REDMINE_TOKEN ||
      !process.env.REDMINE_API_URL ||
      !process.env.TOGGL_API_TOKEN ||
      !process.env.TOGGL_API_URL ||
      !process.env.TOGGL_WORKSPACE_ID ||
      !process.env.DEFAULT_PROJECT
    ) {
      throw new Error(
        "Missing required environment variables. Please check your .env file."
      );
    }

    switch (command) {
      case "--help":
      case "-h":
        await showHelp();
        break;

      case "create-task":
        const taskName = arg1;
        const projectName = arg2 ?? defaultProjectId;
        await createTaskCommand(taskName, projectName, redmineAuth);
        break;

      case "toggle":
        const daysAgo = arg1 ? parseInt(arg1) : 0;
        const totalHours = arg2 ? parseFloat(arg2) : 8;
        await trackTimeCommand({
          daysAgo,
          totalHours,
          redmineAuth,
          redmineUrl,
          togglAuth,
          togglUrl,
          togglWorkspaceId,
        });
        break;

      case "track":
        const issueID = arg1;
        const hours = arg2 ? parseFloat(arg2) : 0;
        const comment = arg3 ?? "";
        await trackTaskCommand(
          issueID,
          hours,
          comment,
          redmineAuth,
          redmineUrl
        );
        break;

      case "search":
        const searchQuery = arg1;
        await searchCommand(searchQuery, redmineAuth);
        break;

      default:
        console.log("❌ Invalid command. Use --help for options.");
        break;
    }
  } catch (error: any) {
    console.error("An unexpected error occurred:", error.message);
    console.error("🔍 Error details:", {
      command: process.argv.slice(2),
      env: {
        REDMINE_TOKEN: process.env.REDMINE_TOKEN,
        REDMINE_API_URL: process.env.REDMINE_API_URL,
        TOGGL_API_TOKEN: process.env.TOGGL_API_TOKEN,
        TOGGL_API_URL: process.env.TOGGL_API_URL,
        TOGGL_WORKSPACE_ID: process.env.TOGGL_WORKSPACE_ID,
        DEFAULT_PROJECT: process.env.DEFAULT_PROJECT,
      },
    });
    process.exit(1);
  }
})();
