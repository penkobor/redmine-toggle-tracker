import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { createBasicAuth } from "./lib/auth.js";
import { validateAndAdjustRedmineUrl } from "./lib/helpers.js";
import { initConfig, redmineClient, togglClient } from "toggl-redmine-bridge";

// Convert the URL to a file path and calculate the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Configure dotenv with the path to .env file
dotenv.config({ path: path.join(rootDir, ".env") });

const redmineAuth = {
  username: process.env.REDMINE_TOKEN!,
  password: "pass",
};

const togglAuth = {
  username: process.env.TOGGL_API_TOKEN!,
  password: "api_token",
};
const togglUrl = process.env.TOGGL_API_URL!;

const redmineUrl = validateAndAdjustRedmineUrl(process.env.REDMINE_API_URL!);

export const init = () => {
  initConfig({
    redmine: {
      baseUrl: redmineUrl,
      token: createBasicAuth(redmineAuth),
    },
    toggl: {
      baseUrl: togglUrl,
      token: createBasicAuth(togglAuth),
    },
  });
};
