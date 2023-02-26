const request = require('request');

// Toggl API details
const togglApiToken = 'YOUR_TOGGLE_API_TOKEN';
const togglWorkspaceId = 'YOUR_TOGGLE_WORKSPACE_ID';
const togglTimeEntriesUrl = 'https://api.track.toggl.com/api/v8/time_entries';

// Redmine API details
const redmineApiKey = 'YOUR_REDMINE_API_KEY';
const redmineTimeEntriesUrl = 'https://redmine.sabo-gmbh.de/time_entries.json';

// Get today's date in the required format
const today = new Date().toISOString().split('T')[0];

// Get Toggl time entries for today
const togglAuth = { 'user': togglApiToken, 'pass': 'api_token' };
const togglParams = { 'start_date': today + 'T00:00:00+00:00', 'end_date': today + 'T23:59:59+00:00', 'workspace_id': togglWorkspaceId };
const togglOptions = { 'url': togglTimeEntriesUrl, 'auth': togglAuth, 'qs': togglParams };
request.get(togglOptions, function (error, response, body) {
  if (error) {
    console.log('Failed to get Toggl time entries:', error);
    return;
  }

  if (response.statusCode !== 200) {
    console.log('Failed to get Toggl time entries:', response.statusCode);
    return;
  }

  // Extract time entry details
  const togglTimeEntries = JSON.parse(body);
  const redmineTimeEntries = [];

  togglTimeEntries.forEach(function (entry) {
    const description = entry.description;
    const durationInSeconds = entry.duration;
    const durationInHours = Math.round(durationInSeconds / 3600 * 100) / 100;
    const spentOn = entry.start.substring(0, 10);
    const issueId = description.split(" ")?.find((word) => word.startsWith("#"))?.replace(/[^0-9]/g, "");

    if (issueId) {
    // Prepare Redmine time entry data
    const redmineTimeEntry = {
      'time_entry': {
        'issue_id': Number(issueId),
        'hours': durationInHours,
        'spent_on': spentOn,
        'comments': description,
        'activity_id': 9 // development
      }
    };
    redmineTimeEntries.push(redmineTimeEntry);
    }
  });

  // Track time in Redmine
  redmineTimeEntries.forEach(function (entry) {
    const redmineAuth = { 'user': redmineApiKey, 'pass': 'pass' };
    const redmineOptions = { 'url': redmineTimeEntriesUrl, 'headers': 'application/json', 'auth': redmineAuth, 'json': entry };
    request.post(redmineOptions, function (error, response, body) {
        if (error) {
        console.log('Failed to track time in Redmine:', error);
        return;
        }

        if (response.statusCode !== 201) {
        console.log('Failed to track time in Redmine:', response.body);
        return;
        }
        console.log(`#${entry.time_entry.issue_id}: ${entry.time_entry.hours}h tracked in Redmine.`);
    });
  });
});