# 🚀 Toggl to Redmine: Time Travel Made Easy!

A Node.js project that takes your time entries from Toggl and delivers them straight to Redmine, no fuss, no forgotten hours.

## 📋 Prerequisites

- 🟢 Node.js and npm installed on your system.
- 🟢 Yarn installed globally.
- 🟢 For the script to do its thing, Toggl entries need a Redmine issue ID in the description, formatted like `#issue_id` (e.g., `#12233: some description`). It hunts for the `#` and grabs the issue ID from there.

## 📦 Installation

To set up the project globally, just follow these steps:

1. **Install the project dependencies:**

   ```sh
   yarn install
   ```

2. **Build the project:**

   ```sh
   yarn build
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
