#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config();

import {
  showHelp,
  createTaskCommand,
  trackTimeCommand,
  searchCommand,
} from "./lib/commands";

(async function main() {
  const [command, arg1, arg2] = process.argv.slice(2);

  const redmineAuth = {
    username: process.env.REDMINE_TOKEN!,
    password: "pass",
  };
  const redmineUrl = process.env.REDMINE_API_URL!;

  const togglAuth = {
    username: process.env.TOGGL_API_TOKEN!,
    password: "api_token",
  };
  const togglUrl = process.env.TOGGL_API_URL!;

  const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;
  const defaultProjectId = process.env.DEFAULT_PROJECT!;

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

    case "track-time":
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

    case "search":
      const searchQuery = arg1;
      await searchCommand(searchQuery, redmineAuth);
      break;

    default:
      console.log("❌ Invalid command. Use --help for options.");
      break;
  }
})();
