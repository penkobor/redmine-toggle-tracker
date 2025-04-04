import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Convert the URL to a file path and calculate the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Configure dotenv with the path to .env file
dotenv.config({ path: path.join(rootDir, ".env") });

export const redmineAuth = {
  username: process.env.REDMINE_TOKEN!,
  password: "pass",
};

export const togglAuth = {
  username: process.env.TOGGL_API_TOKEN!,
  password: "api_token",
};
