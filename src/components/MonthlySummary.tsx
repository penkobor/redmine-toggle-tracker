import React from "react";
import { CommandsProps } from "./types.js";
import { Box, Text } from "ink";
import { useQuery } from "@tanstack/react-query";
import { redmineAuth } from "../constants.js";
import { fetchUserTimeEntries } from "../lib/redmine.js";
import { getDaysFromDate } from "../lib/helpers.js";

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const days = getDaysFromDate();

export const MonthlySummary = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["monthly-summary", month, year],
    queryFn: () => {
      // Implement the monthly summary logic here
      return Promise.all(
        days.map(async (day) => {
          const date = new Date(year, month, day);
          const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
          date.setDate(date.getDate() + 1);
          const dateString = date.toISOString().split("T")[0];
          const entries = await fetchUserTimeEntries(redmineAuth, dateString);
          const totalHours = entries.reduce(
            (acc, entry) => acc + entry.hours,
            0
          );
          let isHoliday =
            dayName.toLowerCase() === "saturday" ||
            dayName.toLowerCase() === "sunday";
          const dayIcon = isHoliday ? "💤" : totalHours >= 7.5 ? "✔️" : "⚠️";
          return `${dateString} - ${dayName.padEnd(15)} ${Math.round(
            totalHours
          )} ${dayIcon}`;
        })
      );
    },
  });

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box flexDirection="column">
      {data.map((entry, idx) => {
        return (
          <Text key={idx} color="green">
            {entry}
          </Text>
        );
      })}
    </Box>
  );
};
