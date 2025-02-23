import { createBasicAuth } from "./auth";
import { fetchJSON, makeQueryFromObject } from "./helpers";

export interface TogglEntry {
  description: string;
  duration: number;
  start: string;
  billable: boolean;
  tags: string[];
}

export async function fetchTogglTimeEntries(
  togglAuth: { username: string; password: string },
  togglUrl: string,
  date: string,
  togglWorkspaceId: string
) {

  // #TODO: get the account's desired TZ offset from Toggl API, not from local machine. It will be most probably equal, but not guaranteed.
  // Date.getTimezoneOffset is weird, giving negative values for "ahead" timezones (e.g. UTC+1 = -60) and vice versa
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset#negative_values_and_positive_values
  // Hence the negation in the following line
  const localMachineTZOffsetMinutes = -(new Date(date).getTimezoneOffset());
  const tzOffsetHrsFormatted = localMachineTZOffsetMinutes < 0 ? "-" : "+" + `00${Math.abs(localMachineTZOffsetMinutes / 60)}`.slice(-2);

  const params = {
    start_date: `${date}T00:00:00${tzOffsetHrsFormatted}:00`,
    end_date: `${date}T23:59:59${tzOffsetHrsFormatted}:00`,
    workspace_id: togglWorkspaceId,
  };

  const url = `${togglUrl}${makeQueryFromObject(params)}`;
  try {
    const response = await fetchJSON(url, {
      headers: {
        Authorization: createBasicAuth(togglAuth),
      },
    });
    return (response as TogglEntry[]).map((entry) => ({
      ...entry,
      start: new Date(new Date(entry.start).getTime() + localMachineTZOffsetMinutes * 60 * 1000).toISOString(),
    }));
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
