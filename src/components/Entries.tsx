import React from "react";
import { getDateString } from "../lib/helpers.js";
import { fetchUserTimeEntries } from "../lib/redmine.js";
import { Box, Text } from "ink";
import { useQuery } from "@tanstack/react-query";
import { redmineAuth } from "../constants.js";
import { EntriesProps } from "./types.js";

export const Entries = ({ args }: EntriesProps) => {
  const [arg1] = args ?? [];
  const daysAgo = arg1 ? parseInt(arg1) : 0;
  const date = getDateString(daysAgo);
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["entries", date],
    queryFn: () => fetchUserTimeEntries(redmineAuth, date),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (entries.length === 0) {
    return <Text>No time entries found for {date}</Text>;
  }

  return (
    <Box flexDirection="column">
      {entries.map((entry, idx) => {
        return (
          <Text
            key={`${entry.issue.id}-${idx}`}
          >{`- Issue #${entry.issue.id}: ${entry.hours}h - ${entry.comments}`}</Text>
        );
      })}
    </Box>
  );
};
