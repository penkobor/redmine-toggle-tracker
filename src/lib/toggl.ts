import { createBasicAuth } from "./auth";
import { fetchJSON } from "./helpers";

const makeQueryFromObject = (obj) => {
  return Object.keys(obj)
    .map((key, idx) => {
      return `${idx === 0 ? "?" : ""}${key}=${obj[key]}`;
    })
    .join("&");
};

export async function fetchTogglTimeEntries(
  togglAuth,
  togglUrl,
  date,
  togglWorkspaceId
) {
  const params = {
    start_date: `${date}T00:00:00Z`,
    end_date: `${date}T23:59:59Z`,
    workspace_id: togglWorkspaceId,
  };

  const url = `${togglUrl}${makeQueryFromObject(params)}`;
  console.log(url, createBasicAuth(togglAuth));
  try {
    console.log(url, createBasicAuth(togglAuth));
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    return response;
  } catch (err) {
    console.error("Failed to fetch Toggl time entries:", err);
    return [];
  }
}
