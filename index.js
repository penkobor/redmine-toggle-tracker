#!/usr/bin/env node
require("dotenv").config();
const request = require("request");
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

// Function to fetch all projects from Redmine
function fetchAllProjects(callback) {
  const redmineAuth = { user: redmineApiKey, pass: "pass" };
  const redmineProjectsUrl = "https://redmine.sabo-gmbh.de/projects.json";

  let allProjects = [];
  let offset = 0;
  const limit = 100;

  function fetchBatch() {
    const projectsOptions = {
      url: redmineProjectsUrl,
      auth: redmineAuth,
      qs: {
        limit: limit,
        offset: offset,
      },
    };

    request.get(projectsOptions, function (error, response, body) {
      if (error) {
        console.log("Failed to fetch projects from Redmine:", error);
        return callback(error);
      }

      if (response.statusCode !== 200) {
        console.log(
          "Failed to fetch projects from Redmine:",
          response.statusCode,
          response.body
        );
        return callback(new Error("Failed to fetch projects from Redmine"));
      }

      const data = JSON.parse(body);
      const projects = data.projects;

      if (projects.length === 0) {
        // No more projects to fetch
        return callback(null, allProjects);
      }

      allProjects = allProjects.concat(projects);

      // Update offset for the next batch
      offset += limit;

      // Check if we've fetched all projects
      if (allProjects.length >= data.total_count) {
        // All projects fetched
        callback(null, allProjects);
      } else {
        // Fetch next batch
        fetchBatch();
      }
    });
  }

  // Start fetching batches
  fetchBatch();
}

// Function to create a new task in Redmine
function createTask(taskName, projectName) {
  const redmineAuth = { user: redmineApiKey, pass: "pass" };

  fetchAllProjects(function (error, projects) {
    if (error) {
      console.log("Error fetching projects:", error);
      return;
    }

    let selectedProject;

    if (projectName) {
      // Find the project by name
      selectedProject = projects.find(
        (project) => project.name === projectName
      );
      if (!selectedProject) {
        console.log(`Project "${projectName}" not found.`);
        return;
      }
      proceedToCreateIssue(selectedProject);
    } else {
      if (projects.length === 0) {
        console.log("No projects found in Redmine.");
        return;
      }
      // Display projects to the user
      console.log("\nAvailable projects:\n");
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
      });

      // Prompt the user to select a project
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        "\nEnter the number of the project where the task should be created: ",
        (answer) => {
          const projectIndex = parseInt(answer) - 1;
          if (
            isNaN(projectIndex) ||
            projectIndex < 0 ||
            projectIndex >= projects.length
          ) {
            console.log("Invalid project selection.");
            rl.close();
            return;
          }
          selectedProject = projects[projectIndex];
          rl.close();
          proceedToCreateIssue(selectedProject);
        }
      );
    }

    function proceedToCreateIssue(selectedProject) {
      // Prompt for tracker type
      const trackers = ["Task", "Bug"];
      console.log("\nAvailable trackers:\n");
      trackers.forEach((tracker, index) => {
        console.log(`${index + 1}. ${tracker}`);
      });

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(
        "\nEnter the number of the tracker type: ",
        (trackerAnswer) => {
          const trackerIndex = parseInt(trackerAnswer) - 1;
          if (
            isNaN(trackerIndex) ||
            trackerIndex < 0 ||
            trackerIndex >= trackers.length
          ) {
            console.log("Invalid tracker selection.");
            rl.close();
            return;
          }
          const selectedTracker = trackers[trackerIndex];

          // Prompt for description
          rl.question(
            "\nEnter the description of the task (optional): ",
            (description) => {
              rl.close();

              // Now we have all the info, create the task via API
              const issueData = {
                issue: {
                  project_id: selectedProject.id,
                  subject: taskName,
                  tracker_id: getTrackerId(selectedTracker),
                  description: description,
                },
              };

              const createIssueOptions = {
                url: "https://redmine.sabo-gmbh.de/issues.json",
                auth: redmineAuth,
                headers: {
                  "Content-Type": "application/json",
                },
                json: issueData,
              };

              request.post(
                createIssueOptions,
                function (error, response, body) {
                  if (error) {
                    console.log("Failed to create issue in Redmine:", error);
                    return;
                  }

                  if (response.statusCode !== 201) {
                    console.log(
                      "Failed to create issue in Redmine:",
                      response.statusCode,
                      response.body
                    );
                    return;
                  }

                  console.log(
                    `\nIssue created successfully with ID #${body.issue.id}`
                  );
                }
              );
            }
          );
        }
      );
    }
  });
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

  // SET ALL YOU NEED HERE
  const OPTIONS = {
    WHEN: timeIntervalBasedOnArgument(),
    N_OF_HOURS: secondArgument ?? 8,
  };

  // Get Toggl time entries for today
  const togglAuth = { user: togglApiToken, pass: "api_token" };
  const togglParams = {
    start_date: OPTIONS.WHEN + "T00:00:00+00:00",
    end_date: OPTIONS.WHEN + "T23:59:59+00:00",
    workspace_id: togglWorkspaceId,
  };
  const togglOptions = {
    url: togglTimeEntriesUrl,
    auth: togglAuth,
    qs: togglParams,
  };

  request.get(togglOptions, function (error, response, body) {
    if (error) {
      console.log("Failed to get Toggl time entries:", error);
      return;
    }

    if (response.statusCode !== 200) {
      console.log("Failed to get Toggl time entries:", response.statusCode);
      return;
    }

    // Extract time entry details
    const togglTimeEntries = JSON.parse(body).filter(
      (entry) => entry.description !== undefined
    );

    const redmineTimeEntries = [];

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

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(
      "\nDo you want to proceed with tracking these time entries in Redmine? (y/n) ",
      (answer) => {
        rl.close();
        if (answer.toLowerCase() === "y") {
          trackTimeInRedmine(redmineTimeEntries);
        } else {
          console.log("Time tracking cancelled.");
        }
      }
    );
  });

  function trackTimeInRedmine(redmineTimeEntries) {
    redmineTimeEntries.forEach(function (entry) {
      const redmineAuth = { user: redmineApiKey, pass: "pass" };
      const redmineOptions = {
        url: redmineTimeEntriesUrl,
        headers: "application/json",
        auth: redmineAuth,
        json: entry,
      };

      request.post(redmineOptions, function (error, response, body) {
        if (error) {
          console.log("Failed to track time in Redmine:", error);
          return;
        }

        if (response.statusCode !== 201) {
          console.log("Failed to track time in Redmine:", response.body);
          return;
        }
        console.log(
          `#${entry.time_entry.issue_id}: ${entry.time_entry.hours}h tracked in Redmine.`
        );
      });
    });
  }
}
