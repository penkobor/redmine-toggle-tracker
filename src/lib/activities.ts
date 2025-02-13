export function getActivityId(description: string, tags: string[]): number {
  const mapOfActivities: Record<string, number> = JSON.parse(
    process.env.ACTIVITIES_MAP!
  );
  for(const activityLabel of Object.keys(mapOfActivities)) {
    const activityId = mapOfActivities[activityLabel];
    if(description.includes(`@${activityLabel}`)) {
      return activityId;
    }
    if(tags.includes(activityLabel)) {
      return activityId;
    }
  }
  const defaultTag = mapOfActivities['_default'];
  console.log(`❌ Tag or label not found, will upload with default ${defaultTag}`);
  return mapOfActivities[defaultTag];
}
