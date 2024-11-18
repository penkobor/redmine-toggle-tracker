export function getActivityId(description: string): number {
  const mapOfActivities: Record<string, number> = JSON.parse(
    process.env.ACTIVITIES_MAP!
  );

  if (description.includes("@dev")) return mapOfActivities["@dev"];
  if (description.includes("@test")) return mapOfActivities["@test"];
  if (description.includes("@call")) return mapOfActivities["@call"];
  if (description.includes("@analysis")) return mapOfActivities["@analysis"];
  return mapOfActivities["@dev"];
}
