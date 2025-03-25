import React from "react";
import { CommandsProps } from "./types.js";
import { Box, Text } from "ink";
import { useQuery } from "@tanstack/react-query";
import { redmineAuth } from "../constants.js";
import { searchIssues } from "../lib/redmine.js";

const SearchInternal = ({ searchQuery }: { searchQuery: string }) => {
  const { data = [] } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => {
      // Implement the search logic here
      return searchIssues(searchQuery, redmineAuth);
    },
    refetchOnWindowFocus: false,
  });

  return (
    <Box flexDirection="column">
      {data.map((issue) => {
        return (
          <Text key={issue.id}>{`- Issue #${issue.id}: ${issue.subject}`}</Text>
        );
      })}
    </Box>
  );
};

export const Search = ({ args }: CommandsProps) => {
  const [searchQuery] = args ?? [];
  if (!searchQuery) {
    return <Text>Please provide a search query.</Text>;
  }
  return <SearchInternal searchQuery={searchQuery} />;
};
