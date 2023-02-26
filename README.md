# redmine-toggle-tracker
A node js project to import time entries from toggl to redmine 

## Prerequisites

In order for this script to work correctly, time entries in Toggl should include redmine issue id in description. The format should be #issue_id for example #12233: some description. The script will look for # char and take issue id from there.

## Installation

To install the project dependencies, run:

`yarn install`

## Configuration

Set your toggl API token and workspace ID as well as Redmine API key in the index.js file.

`const togglApiToken = 'YOUR_TOGGL_API_TOKEN';`
`const togglWorkspaceId = 'YOUR_TOGGL_WORKSPACE_ID';`
`const redmineApiKey = 'YOUR_REDMINE_API_KEY';`

## Usage

To start the project, run:

`yarn start`

## Additional Notes

For more handy use, you can write a function in your ~/.zshrc file which will cd to the project folder by absolute path and run yarn start.