#!/usr/bin/env node
import dotenv from "dotenv";
import path from "path";
import { validateAndAdjustRedmineUrl } from "./lib/helpers.js";
import {
  trackTaskCommand,
  printMonthlySummaryCommand,
  createTaskCommand,
  showHelp,
  searchCommand,
  getEntriesCommand,
  deleteEntryCommand,
  trackTimeCommand,
} from "./lib/commands.js";
import {} from "./lib/commands.js";
import React, { useState, useEffect, JSX } from "react";
import { render, Text } from "ink";
import { Help } from "./components/Help.js";

dotenv.config({ path: path.join(import.meta.url, "..", ".env") });

async function main() {
  const [command, arg1, arg2, arg3, arg4] = process.argv.slice(2);

  try {
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
        const daysAgoTrack = arg4 ? parseInt(arg4) : 0;
        await trackTaskCommand(
          issueID,
          hours,
          comment,
          daysAgoTrack,
          redmineAuth,
          redmineUrl
        );
        break;

      case "search":
        const searchQuery = arg1;
        await searchCommand(searchQuery, redmineAuth);
        break;

      case "get-entries":
        const daysAgoEntries = arg1 ? parseInt(arg1) : 0;
        await getEntriesCommand(daysAgoEntries, redmineAuth);
        break;

      case "delete":
        const daysAgoDelete = arg1 ? parseInt(arg1) : 0;
        await deleteEntryCommand(daysAgoDelete, redmineAuth);
        break;

      case "print-monthly-summary":
        await printMonthlySummaryCommand(redmineAuth);
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
}

const OutputMap: Record<string, () => JSX.Element> = {
  "--help": Help,
  "-h": Help,
};

const App = () => {
  const [command, arg1, arg2, arg3, arg4] = process.argv.slice(2);

  const Component =
    OutputMap[command as any] || (() => <Text>Invalid command</Text>);

  return <Component />;
};

render(<App />);
