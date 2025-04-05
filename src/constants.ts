import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { client as redmineClient } from "./api-redmine/client.gen.js";
import { client as togglClient } from "./api-toggl/client.gen.js";
import { createBasicAuth } from "./lib/auth.js";
import { validateAndAdjustRedmineUrl } from "./lib/helpers.js";


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
const redmineUrl = validateAndAdjustRedmineUrl(
  process.env.REDMINE_API_URL!
);

redmineClient.setConfig({
  baseUrl: redmineUrl,
  headers: {
    Authorization: createBasicAuth(redmineAuth)
  }
});

const togglAuth = {
  username: process.env.TOGGL_API_TOKEN!,
  password: "api_token",
};
const togglUrl = process.env.TOGGL_API_URL!;

togglClient.setConfig({
  baseUrl: togglUrl,
  headers: {
    Authorization: createBasicAuth(togglAuth)
  }
});

export {
  redmineClient,
  togglClient
};
