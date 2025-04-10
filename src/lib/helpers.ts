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
