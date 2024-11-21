# redmine-toggle-tracker

A Node.js project to import time entries from Toggl to Redmine.

## Prerequisites

- Node.js and npm installed on your system.
- Yarn installed globally.
- In order for this script to work correctly, time entries in Toggl should include redmine issue id in description. The format should be #issue_id for example #12233: some description. The script will look for # char and take issue id from there.

## Installation

To install the project globally, follow these steps

1. Install the project dependencies

```sh
yarn install
```

2. Build the project.

```sh
yarn build
```

3. Make the built script executable

```sh
chmod +x dist/index.js
```

4. Install the project globally:

```sh
npm install -g .
```

This will make the redmine command available globally.
