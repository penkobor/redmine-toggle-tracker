import { Client } from "@hey-api/client-fetch";
import { getMyTimeEntries, ModelsTimeEntry, getPreferences } from "../api-toggl";

export async function fetchTogglTimeEntries(
  client: Client,
  date: string,
  togglWorkspaceId: string
): Promise<ModelsTimeEntry[]> {



  // #TODO: get the account's desired TZ offset from Toggl API, not from local machine. It will be most probably equal, but not guaranteed.
  // Date.getTimezoneOffset is weird, giving negative values for "ahead" timezones (e.g. UTC+1 = -60) and vice versa
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset#negative_values_and_positive_values
  // Hence the negation in the following line
  const localMachineTZOffsetMinutes = -(new Date(date).getTimezoneOffset());
  const tzOffsetHrsFormatted = localMachineTZOffsetMinutes < 0 ? "-" : "+" + `00${Math.abs(localMachineTZOffsetMinutes / 60)}`.slice(-2);

  // const preferencesResponse = await getPreferences({
  //   client
  // });
  // preferencesResponse.data!.pg_time_zone_name;

  const params = {
    start_date: `${date}T00:00:00${tzOffsetHrsFormatted}:00`,
    end_date: `${date}T23:59:59${tzOffsetHrsFormatted}:00`,
    workspace_id: togglWorkspaceId,
  };

  const response = await getMyTimeEntries({
    client,
    query: {
      ...params,
      meta: false,
      include_sharing: false
    },
  });
  if(response.error) {
    console.error("❌ Failed to fetch Toggl time entries:", response.error);
    console.error("🔍 Error details:", {
      client: client.getConfig().baseUrl,
      params,
      headers: client.getConfig().headers,
    });
    process.exit(1);
  } else {
    return response.data!.map((entry) => ({
      ...entry,
      start: new Date(new Date(entry.start!).getTime() + localMachineTZOffsetMinutes * 60 * 1000).toISOString()
    }));
    
  }
}
