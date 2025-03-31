export const makeQueryFromObject = (obj: {
  [x: string]: any;
  start_date?: string;
  end_date?: string;
  workspace_id?: string;
}) => {
  return Object.keys(obj)
    .map((key, idx) => {
      return `${idx === 0 ? "?" : ""}${key}=${encodeURIComponent(obj[key])}`;
    })
    .join("&");
};

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

export function validateAndAdjustRedmineUrl(
  url: string,
  skipValidation: boolean = false
): string {
  if (!skipValidation) {
    try {
      new URL(url);
    } catch (e) {
      console.error(`❌ Invalid URL format: ${url}`);
      console.error("🔍 Error details:", {
        url,
      });
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  if (!url.endsWith("/")) {
    url += "/";
  }

  return url.trim();
}

export const getDaysFromDate = (date = new Date()) => {
  return Array.from({ length: date.getDate() }, (_, i) => i + 1);
};
