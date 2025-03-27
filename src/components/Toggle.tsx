import React, { useState } from "react";
import { CommandsProps } from "./types.js";
import { getDateString, validateAndAdjustRedmineUrl } from "../lib/helpers.js";
import { Box, Text, useApp, useInput } from "ink";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchTogglTimeEntries } from "../lib/toggl.js";
import { redmineAuth, togglAuth } from "../constants.js";
import { prepareRedmineEntries, trackTimeInRedmine } from "../lib/redmine.js";
import { ConfirmInput } from "./ConfirmInput.js";

const togglUrl = process.env.TOGGL_API_URL!;
const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;
const redmineUrl = validateAndAdjustRedmineUrl(process.env.REDMINE_API_URL!);

export const Toggle = ({ args }: CommandsProps) => {
  const [arg1, arg2] = args ?? [];
  const daysAgo = arg1 ? parseInt(arg1) : 0;
  const totalHours = arg2 ? parseFloat(arg2) : 8;
  const date = getDateString(daysAgo);
  const { exit } = useApp();
  const [shouldTrack, setShouldTrack] = useState(false);
  const [shouldTrackRedmine, setShouldTrackRedmine] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["toggle", date],
    queryFn: async () => {
      const toggleEntries = await fetchTogglTimeEntries(
        togglAuth,
        togglUrl,
        date,
        togglWorkspaceId
      );
      // Implement the toggle logic here
      return prepareRedmineEntries(toggleEntries, totalHours);
    },
    refetchOnWindowFocus: false,
    enabled: shouldTrack,
  });

  const { mutate, isSuccess, isPending } = useMutation({
    mutationKey: ["track", date],
    mutationFn: async () => {
      await trackTimeInRedmine(entries, redmineAuth, redmineUrl);
    },
    onSuccess: () => {
      exit();
    },
  });

  if (!shouldTrack) {
    return (
      <Box>
        <Text>
          Track {totalHours} hours for date "{date}"? (y/n)
        </Text>
        <ConfirmInput
          onPress={(checked) => {
            setShouldTrack(checked);
          }}
        />
      </Box>
    );
  }

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text>Time entries to be tracked in Redmine:</Text>
      {entries.map((entry, idx) => {
        const issueId = entry.time_entry.issue_id;
        const hours = entry.time_entry.hours;
        const comments = entry.time_entry.comments;
        return (
          <Text key={`${issueId}-${idx}`}>
            {`- Issue #${issueId}: ${hours}h - ${comments}`}
          </Text>
        );
      })}
      {!shouldTrackRedmine && (
        <Box flexDirection="column">
          <Text>
            Do you want to proceed with tracking these time entries in Redmine?
            (y/n)
          </Text>
          <ConfirmInput
            onPress={(checked) => {
              if (checked) {
                setShouldTrackRedmine(checked);
                mutate();
              }
            }}
          />
        </Box>
      )}
      {isPending && <Text>Tracking time entries...</Text>}
      {isSuccess && <Text>Time entries tracked successfully!</Text>}
    </Box>
  );
};
