import React, { useState } from "react";
import { CommandsProps } from "./types.js";
import { getDateString, getDaysFromDate } from "../lib/helpers.js";
import { Box, Text, useApp } from "ink";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchTogglTimeEntries } from "../lib/toggl.js";
import { prepareRedmineEntries, trackTimeInRedmine } from "../lib/redmine.js";
import { ConfirmInput } from "./ConfirmInput.js";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { togglClient, redmineClient } from "toggl-redmine-bridge";

const togglWorkspaceId = process.env.TOGGL_WORKSPACE_ID!;

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const days = getDaysFromDate(today);

const ToggleInternal = ({
  date,
  totalHours,
}: {
  date: string;
  totalHours: number;
}) => {
  const { exit } = useApp();
  const [shouldTrackRedmine, setShouldTrackRedmine] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["toggle", date],
    queryFn: async () => {
      const toggleEntries = await fetchTogglTimeEntries(
        togglClient as any,
        date,
        togglWorkspaceId
      );
      // Implement the toggle logic here
      return prepareRedmineEntries(toggleEntries, totalHours);
    },
    refetchOnWindowFocus: false,
  });

  const { mutate, isSuccess, isPending } = useMutation({
    mutationKey: ["track", date],
    mutationFn: async () => {
      await trackTimeInRedmine(redmineClient as any, entries);
    },
    onSuccess: () => {
      exit();
    },
  });

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (entries.length === 0) {
    return (
      <Text color="red">No time entries found for the selected date.</Text>
    );
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
              } else {
                exit();
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

const options = days
  .map((day) => {
    const date = new Date(year, month, day);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    date.setDate(date.getDate() + 1);
    const dateString = date.toISOString().split("T")[0];
    return {
      label: `${dateString} - ${dayName}`,
      value: dateString,
    };
  })
  .reverse();

export const Toggle = ({ args }: CommandsProps) => {
  const [arg1, arg2] = args ?? [];
  const daysAgo = parseInt(arg1);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (isNaN(daysAgo)) {
      return undefined;
    }
    return getDateString(daysAgo);
  });
  const [submittedHours, setSubmittedHours] = useState(() => {
    const parsedValue = parseInt(arg2);
    return isNaN(parsedValue) ? undefined : parsedValue;
  });
  const [totalHours, setTotalHours] = useState(arg2);
  const [shouldTrack, setShouldTrack] = useState(false);
  const { exit } = useApp();

  if (!selectedDate) {
    return (
      <Box flexDirection="column">
        <Text>Select a date:</Text>
        <SelectInput
          items={options}
          limit={10}
          onSelect={(item) => setSelectedDate(item.value)}
        />
      </Box>
    );
  }

  if (submittedHours == null || submittedHours === undefined) {
    const parsedValue = totalHours?.toString() ?? "";
    return (
      <Box>
        <Text>Enter total hours for date "{selectedDate}":</Text>
        <TextInput
          value={parsedValue}
          onChange={(input) => {
            setTotalHours(input);
          }}
          onSubmit={() => {
            const parsedValue = (totalHours && parseInt(totalHours)) || 0;
            setSubmittedHours(parsedValue);
          }}
        />
      </Box>
    );
  }

  if (!shouldTrack) {
    return (
      <Box>
        <Text>
          Track {totalHours} hours for date "{selectedDate}"? (y/n)
        </Text>
        <ConfirmInput
          onPress={(checked) => {
            if (!checked) {
              exit();
              return;
            }
            setShouldTrack(checked);
          }}
        />
      </Box>
    );
  }

  return <ToggleInternal date={selectedDate} totalHours={submittedHours} />;
};
