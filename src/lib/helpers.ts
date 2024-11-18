export async function fetchJSON(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `${response.status} - ${response.statusText} - ${errorText}`
    );
  }
  return response.json();
}

export function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}
