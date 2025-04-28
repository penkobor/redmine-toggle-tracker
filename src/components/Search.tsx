import React, { useState } from "react";
import { Box, Text } from "ink";
import { useQuery } from "@tanstack/react-query";
import { searchIssues } from "../lib/redmine.js";
import TextInput from "ink-text-input";
import { redmineClient } from "@saboit/toggl-redmine-bridge";

export const Search = () => {
  const [currentValue, setCurrentValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => {
      // Implement the search logic here
      return searchIssues(redmineClient, searchQuery);
    },
    enabled: searchQuery.length > 0,
  });

  const handleChange = (value: string) => {
    setCurrentValue(value);
  };

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginTop={1}>
        {isLoading && <Text>Loading...</Text>}
        {data.map((issue, idx) => {
          return (
            <Text
              key={`${issue.id}-${idx}`}
            >{`- Issue #${issue.id}: ${issue.title}`}</Text>
          );
        })}
      </Box>
      <Box flexDirection="column" marginTop={1}>
        <Text>Search for issues:</Text>
        <TextInput
          value={currentValue}
          onChange={handleChange}
          onSubmit={(value: string) => {
            setSearchQuery(value);
          }}
        />
      </Box>
    </Box>
  );
};
