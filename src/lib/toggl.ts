import { createBasicAuth } from "./auth";
import { fetchJSON, makeQueryFromObject } from "./helpers";

export async function fetchTogglTimeEntries(
  togglAuth: { username: string; password: string },
  togglUrl: string,
  date: string,
  togglWorkspaceId: string
) {
  const params = {
    start_date: `${date}T00:00:00Z`,
    end_date: `${date}T23:59:59Z`,
    workspace_id: togglWorkspaceId,
  };

  const url = `${togglUrl}${makeQueryFromObject(params)}`;
  try {
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    return response;
  } catch (err: any) {
    console.error("❌ Failed to fetch Toggl time entries:", err.message);
    console.error("🔍 Error details:", {
      url,
      params,
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    process.exit(1);
  }
}

export async function fetchMyTogglTimeEntries(
  togglAuth: { username: string; password: string },
  togglUrl: string,
  date: string,
  togglWorkspaceId: string
) {
  const params = {
    start_date: `${date}T00:00:00Z`,
    end_date: `${date}T23:59:59Z`,
    workspace_id: togglWorkspaceId,
    user_agent: "api_test",
  };

  const url = `${togglUrl}${makeQueryFromObject(params)}`;
  try {
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    return response;
  } catch (err: any) {
    console.error("❌ Failed to fetch your Toggl time entries:", err.message);
    console.error("🔍 Error details:", {
      url,
      params,
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    process.exit(1);
  }
}
