import dotenv from "dotenv";
dotenv.config();

export const redmineAuth = {
  username: process.env.REDMINE_TOKEN!,
  password: "pass",
};

export const togglAuth = {
  username: process.env.TOGGL_API_TOKEN!,
  password: "api_token",
};
