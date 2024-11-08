#!/usr/bin/env node
require("dotenv").config();
const readline = require("readline");

const LOG_PRECISELY = "@lp";
const CALL = "@call";
const DEVELOPMENT = "@dev";
const TESTING = "@test";
const ANALYSIS = "@analysis";

const mapOfActivities = {
  [CALL]: 62,
  [DEVELOPMENT]: 9,
  [ANALYSIS]: 10,
  [TESTING]: 12,
};

// Toggl API details
const togglApiToken = process.env.TOGGL_TOKEN;
const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID;
const togglTimeEntriesUrl =
  "https://api.track.toggl.com/api/v9/me/time_entries";

// Redmine API details
const redmineApiKey = process.env.REDMINE_TOKEN;
const redmineTimeEntriesUrl = "https://redmine.sabo-gmbh.de/time_entries.json";

const DEFAULT_PROJECT = "VW.LAUT.DEV.LAUT3";

const getDateString = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
};

const dates = {
  yesterday: getDateString(1),
  dayBeforeYesterday: getDateString(2),
  dayBeforeYesterday2: getDateString(3),
  dayBeforeYesterday3: getDateString(4),
  dayBeforeYesterday4: getDateString(5),
  lastFriday: getDateString((new Date().getDay() + 2) % 7),
  today: getDateString(0),
};

const printHelp = () => {
  console.log(`
Usage: node script.js [options]

Options:
  --help                            Show this help message
  create-task "task name"           Create a new task in Redmine
  yesterday                         Track time for yesterday
  dayBeforeYesterday                Track time for the day before yesterday
  dayBeforeYesterday2               Track time for 3 days ago
  dayBeforeYesterday3               Track time for 4 days ago
  dayBeforeYesterday4               Track time for 5 days ago
  lastFriday                        Track time for last Friday
  [no argument]                     Track time for today (default)

The second argument can be used to specify the number of hours (default is 8).

Example: node script.js yesterday 7.5

Example for creating a task:
node script.js create-task "New Task"
`);
};

if (process.argv.includes("--help")) {
  printHelp();
  process.exit(0);
}

const firstArgument = process.argv[2];
const secondArgument = process.argv[3];
const thirdArgument = process.argv[4];

// Function to get tracker ID based on tracker name
function getTrackerId(trackerName) {
  const trackersMap = {
    Task: 5,
    Bug: 1,
  };
  return trackersMap[trackerName] || 5; // Default to Task if not found
}

const redmineAuth = { user: redmineApiKey, pass: "pass" };

const fetchJSON = async (url, options) => {
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
  if (resp.ok) {
    return resp.json();
  }
  const text = await resp.text();
  throw new Error(`${resp.status} - ${resp.statusText} - ${text}`);
};

const makeQueryFromObject = (obj) => {
  return Object.keys(obj)
    .map((key, idx) => {
      return `${idx === 0 ? "?" : ""}${key}=${obj[key]}`;
    })
    .join("&");
};

const askQuestion = (question, selector) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve, reject) => {
    rl.question(question, (answer) => {
      try {
        const resp = selector ? selector(answer) : answer;
        rl.close();
        resolve(resp);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
};

const createBasicAuth = (authObj) => {
  const basicString = Object.values(authObj)
    .map((value) => value)
    .join(":");
  return `Basic ${Buffer.from(basicString).toString("base64")}`;
};

// Function to fetch all projects from Redmine
async function fetchAllProjects() {
  const redmineProjectsUrl = "https://redmine.sabo-gmbh.de/projects.json";
  let offset = 0;
  const limit = 100;

  const qs = {
    limit,
    offset,
  };

  const query = makeQueryFromObject(qs);
  try {
    const { projects } = await fetchJSON(`${redmineProjectsUrl}${query}`, {
      headers: {
        Accept: "application/json",
        Authorization: createBasicAuth(redmineAuth),
      },
    });

    return projects;
  } catch (err) {
    console.error(err);
  }
}

// Function to create a new task in Redmine
async function createTask(taskName, projectName) {
  const redmineAuth = { user: redmineApiKey, pass: "pass" };

  const allProjects = await fetchAllProjects();
  if (!projectName) {
    if (allProjects.length === 0) {
      console.log("No projects found in Redmine.");
      return;
    }
    // Display projects to the user
    console.log("\nAvailable projects:\n");
    allProjects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
    });

    const projectIndex = await askQuestion(
      "\nEnter the number of the project where the task should be created: ",
      (answer) => {
        const idx = parseInt(answer) - 1;
        if (isNaN(idx) || idx < 0 || idx >= projects.length) {
          throw new Error("Invalid project selection.");
        }
        return idx;
      }
    );
    const projectFromSelection = projects[projectIndex];

    if (projectFromSelection) {
      proceedToCreateIssue(projectFromSelection);
    }
  }

  const selectedProject = allProjects.find((p) => p.name === projectName);
  if (!selectedProject) {
    console.log(`Project "${projectName}" not found.`);
    return;
  }
  proceedToCreateIssue(selectedProject);

  async function proceedToCreateIssue(selectedProject) {
    // Prompt for tracker type
    const trackers = ["Task", "Bug"];
    console.log("\nAvailable trackers:\n");
    trackers.forEach((tracker, index) => {
      console.log(`${index + 1}. ${tracker}`);
    });

    const trackerIndex = await askQuestion(
      "\nEnter the number of the tracker type: ",
      (answer) => {
        const index = parseInt(answer) - 1;
        if (isNaN(index) || index < 0 || index >= trackers.length) {
          throw new Error("Invalid tracker selection.");
        }
        return index;
      }
    );
    const selectedTracker = trackers[trackerIndex];

    const description = await askQuestion(
      "\nEnter the description of the task (optional): "
    );

    const issueData = {
      issue: {
        project_id: selectedProject.id,
        subject: taskName,
        tracker_id: getTrackerId(selectedTracker),
        description: description,
      },
    };

    const basicString = Object.values(redmineAuth)
      .map((value) => value)
      .join(":");

    try {
      const { issue } = await fetchJSON(
        "https://redmine.sabo-gmbh.de/issues.json",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicString}`,
          },
          body: issueData,
        }
      );
      console.log(`\nIssue created successfully with ID #${issue.id}`);
    } catch (err) {
      console.log(err);
    }
  }
}

if (firstArgument === "create-task") {
  const taskName = secondArgument;
  const projectName = thirdArgument ?? DEFAULT_PROJECT;
  if (!taskName) {
    console.log('Please provide a task name in quotes, e.g., "New Task".');
    process.exit(1);
  }
  createTask(taskName, projectName);
} else {
  const timeIntervalBasedOnArgument = () => {
    return dates[firstArgument] || dates.today;
  };

  async function trackTime() {
    // SET ALL YOU NEED HERE
    const OPTIONS = {
      WHEN: timeIntervalBasedOnArgument(),
      N_OF_HOURS: secondArgument ?? 8,
    };

    const redmineTimeEntries = [];

    // Get Toggl time entries for today
    const togglAuth = { user: togglApiToken, pass: "api_token" };
    const togglParams = {
      start_date: OPTIONS.WHEN + "T00:00:00Z",
      end_date: OPTIONS.WHEN + "T23:59:59Z",
      workspace_id: togglWorkspaceId,
    };

    const togglTimeEntries = await fetchJSON(
      `${togglTimeEntriesUrl}${makeQueryFromObject(togglParams)}`,
      {
        headers: {
          Authorization: createBasicAuth(togglAuth),
        },
      }
    );

    const togglRealTimeSpend =
      Math.round(
        (togglTimeEntries.reduce((acc, entry) => acc + entry.duration, 0) /
          3600) *
          100
      ) / 100;

    const preciseTimeInHours =
      togglTimeEntries
        .filter((entry) => entry.description.includes(LOG_PRECISELY))
        .reduce((acc, entry) => acc + entry.duration, 0) / 3600;

    const adjustTimeCoefficient =
      (OPTIONS.N_OF_HOURS - preciseTimeInHours) /
      (togglRealTimeSpend - preciseTimeInHours);

    // @lp
    togglTimeEntries.forEach(function (entry) {
      const description = entry.description;
      const durationInSeconds = entry.duration;
      const spentOn = entry.start.substring(0, 10);
      const issueId = description
        .split(" ")
        ?.find((word) => word.startsWith("#"))
        ?.replace(/[^0-9]/g, "");
      const descriptionWithoutIssueId = description
        .replace(/#[0-9]+/, "")
        .replace(LOG_PRECISELY, "")
        .trim();
      const shouldLogPrecisely = description.includes(LOG_PRECISELY);
      const capitalizedDescription =
        descriptionWithoutIssueId.charAt(0).toUpperCase() +
        descriptionWithoutIssueId.slice(1);
      const durationInHours =
        (Math.round((durationInSeconds / 3600) * 100) / 100) *
        (shouldLogPrecisely ? 1 : adjustTimeCoefficient);
      const isDevelopment = description.includes(DEVELOPMENT);
      const isTesting = description.includes(TESTING);
      const isAnalysis = description.includes(ANALYSIS);
      const isCall = description.includes(CALL);
      const correctActivityId = isDevelopment
        ? mapOfActivities[DEVELOPMENT]
        : isTesting
        ? mapOfActivities[TESTING]
        : isAnalysis
        ? mapOfActivities[ANALYSIS]
        : isCall
        ? mapOfActivities[CALL]
        : 9;

      if (issueId) {
        // Prepare Redmine time entry data
        const redmineTimeEntry = {
          time_entry: {
            issue_id: Number(issueId),
            hours: durationInHours,
            spent_on: spentOn,
            comments: capitalizedDescription,
            activity_id: correctActivityId,
          },
        };
        redmineTimeEntries.push(redmineTimeEntry);
      }
    });
    console.log("\n ⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳⏳ ");
    console.log("\nTime entries to be tracked in Redmine:\n");
    // console.log("\n");
    redmineTimeEntries.forEach((entry) => {
      console.log(
        `⏱️  Issue #${entry.time_entry.issue_id}: ${entry.time_entry.hours}h - ${entry.time_entry.comments}`
      );
    });

    const pushToRedmine = await askQuestion(
      "\nDo you want to proceed with tracking these time entries in Redmine? (y/n)"
    );

    if (pushToRedmine === "y") {
      trackTimeInRedmine(redmineTimeEntries);
    } else {
      console.log("Time tracking cancelled.");
    }

    async function trackTimeInRedmine(redmineTimeEntries) {
      redmineTimeEntries.forEach(function (entry) {
        fetchJSON(redmineTimeEntriesUrl, {
          method: "POST",
          headers: {
            Authorization: createBasicAuth(redmineAuth),
          },
          body: JSON.stringify(entry),
        })
          .then(() => {
            console.log(
              `#${entry.time_entry.issue_id}: ${entry.time_entry.hours}h tracked in Redmine.`
            );
          })
          .catch((error) => {
            console.log("Failed to track time in Redmine:", error);
          });
      });
    }
  }

  trackTime();
}
