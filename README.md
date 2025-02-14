# 🚀 Toggl to Redmine: Time Travel Made Easy!

A Node.js project that takes your time entries from Toggl and delivers them straight to Redmine, no fuss, no forgotten hours.

## 📋 Prerequisites

- 🟢 Node.js and npm installed on your system.
- 🟢 .env is configured
- 🟢 For the script to do its thing, Toggl entries need a Redmine issue ID in the description, formatted like `#issue_id` (e.g., `#12233: some description`). It hunts for the `#` and grabs the issue ID from there.

## 📦 Installation

To install the project globally, just run

```sh
./install.sh
```

alternatively you can do it manually by following these steps:

1. **Install the project dependencies:**

   ```sh
   npm install
   ```

2. **Build the project:**

   ```sh
   npm run build
   ```

3. **Make the built script executable:**

   ```sh
   chmod +x dist/index.js
   ```

4. **Install the project globally:**

   ```sh
   npm install -g .
   ```

   This will make the `redmine` command available globally.

## ⚙️ Configuration

Create a `.env` file in the project root directory and set the following environment variables:

- `TOGGL_API_TOKEN`: Your Toggl API token.
- `TOGGL_WORKSPACE_ID`: Your Toggl workspace ID.
- `TOGGL_API_URL`: Toggl API URL (default is `https://api.track.toggl.com/api/v9/me/time_entries`).
- `REDMINE_TOKEN`: Your Redmine API key.
- `REDMINE_API_URL`: The base URL of your Redmine instance (e.g., `https://redmine.example.com`).
- `DEFAULT_PROJECT`: The default Redmine project name for creating tasks.
- `ACTIVITIES_MAP`: A JSON string mapping activity tags to Redmine activity IDs.

**Note**: Keep your API tokens and keys secure and do not share them publicly.

## 🚀 Usage

After installing the project globally, run the script using

```sh
redmine -h
```

## Commands and Their Parameters

### `create-task`

Creates a new task in Redmine.

```sh
redmine create-task <taskName> <projectName>
```

- `<taskName>`: The name of the task to be created.
- `<projectName>`: The name of the Redmine project where the task should be created. If not provided, the default project specified in the `.env` file will be used.

Example:

```sh
redmine create-task "New Feature" "MyProject"
```

### `toggle`

Imports time entries from Toggl to Redmine.

```sh
redmine toggle <daysAgo> <totalHours>
```

- `<daysAgo>`: The number of days ago to fetch the time entries from Toggl (default is 0).
- `<totalHours>`: The total number of hours to track in Redmine. Default is 8. **If the provided number is 0, the script will track all task times precisely as if entered with `lp` label (see below)**.

Example:

```sh
redmine toggle 1 8
```

### `track`

Tracks hours directly to a specific task in Redmine.

```sh
redmine track <issueID> <hours> <comment> <daysAgo>
```

- `<issueID>`: The ID of the Redmine issue.
- `<hours>`: The number of hours to track.
- `<comment>`: A comment describing the work done.
- `<daysAgo>`: The number of days ago to track the hours (default is 0).

Example:

```sh
redmine track 12345 2.5 "Worked on feature X" 1
```

### `search`

Searches for issues in Redmine.

```sh
redmine search <query>
```

- `<query>`: The search query to find issues in Redmine.

Example:

```sh
redmine search "bug fix"
```

### `get-entries`

Fetches and prints your tracked time entries in Redmine.

```sh
redmine get-entries <daysAgo>
```

- `<daysAgo>`: The number of days ago to fetch the entries for (default is 0).

Example:

```sh
redmine get-entries 0
```

### `delete`

Deletes a time entry for a specific day in Redmine.

```sh
redmine delete <daysAgo>
```

- `<daysAgo>`: The number of days ago to delete the time entry for (default is 0).

Example:

```sh
redmine delete 1
```

### `print-monthly-summary`

Prints all days till today in this month, along with the day name and amount of hours tracked for that day. If the amount of hours is less than 7.5, it also prints "NOT FULLY TRACKED DAY".

```sh
redmine print-monthly-summary
```

Example:

```sh
redmine print-monthly-summary
```

## 🏷️ Labels and Their Purpose

The project allows defining labels to map activities to Redmine activity IDs. The label can be applied either as `@label` directly in the description, or as Toggl tag without the `@` prefix. The labels found in the description have higher priority.

You can define the labels as you wish - longer, shorter, even one letter, as long as it is unique and recognizable for you. The assigned numbers must correspond to the target Redmine Activity Ids.

_The tool is internally handling one additional label `lp` which does not correspond to Redmine Activity Id. The label indicates that the time entry should be logged with precise duration without any adjustments._

Example of labels corresponding to SABO Redmine instance activity Ids is following:

## 🗺️ ACTIVITIES_MAP Environment Variable

The `ACTIVITIES_MAP` environment variable is a JSON string that maps activity tags to Redmine activity IDs. Here is an example:

```json
{
  "meeting": 62,
  "development": 9,
  "analysis": 10,
  "test": 12
}
```

In this example, the `meeting` label is mapped to Redmine activity ID 62, the `development` label is mapped to Redmine activity ID 9, the `analysis` label is mapped to Redmine activity ID 10, and the `test` tag is mapped to Redmine activity ID 12.

The map must define additional meta-label `_default` where the key is not an activity ID but a key of another existing activity. Example:

```json
{
  "_default": "development"
}
```

When this tool does not find any known activity label neither in description nor in Toggl tags, it will use the `_default` activity.

## 🔄 Flow of Data Between Toggl and Redmine

1. **Fetching Toggl Time Entries**: The script fetches time entries from Toggl using the Toggl API. The time entries are filtered based on the specified date range and workspace ID.
2. **Processing Time Entries**: The fetched time entries are processed to extract relevant information such as issue ID, duration, description, and activity tags.
3. **Mapping Activities**: The activity tags in the time entries are mapped to Redmine activity IDs using the `ACTIVITIES_MAP` environment variable.
4. **Tracking Time in Redmine**: The processed time entries are then tracked in Redmine by creating time entries using the Redmine API.

## Detailed Explanation of How the Code Works

The code is organized into several modules, each responsible for specific functionalities. Here is a high-level overview of the main modules and their purposes:

- `src/index.ts`: The entry point of the application. It handles command-line arguments and executes the corresponding commands.
- `src/lib/commands.ts`: Contains the implementation of various commands such as `create-task`, `toggle`, `track`, `search`, `get-entries`, and `delete`.
- `src/lib/helpers.ts`: Provides utility functions for making API requests, formatting dates, and validating URLs.
- `src/lib/auth.ts`: Handles authentication for Redmine and Toggl APIs.
- `src/lib/activities.ts`: Contains functions for mapping activity tags to Redmine activity IDs.
- `src/lib/questions.ts`: Provides functions for prompting user input from the command line.
- `src/lib/redmine.ts`: Contains functions for interacting with the Redmine API, including creating tasks, tracking time, searching issues, and fetching user time entries.
- `src/lib/toggl.ts`: Contains functions for interacting with the Toggl API, including fetching time entries.

The main flow of the application is as follows:

1. The user runs the `redmine` command with the desired arguments.
2. The `src/index.ts` file parses the command-line arguments and executes the corresponding command from `src/lib/commands.ts`.
3. The command functions in `src/lib/commands.ts` interact with the Redmine and Toggl APIs using the helper functions from other modules.
4. The results are displayed to the user, and any necessary user input is prompted using the functions from `src/lib/questions.ts`.

This modular structure ensures that the code is organized, maintainable, and easy to understand.
