import React, { Fragment } from "react";
import { CommandsProps } from "./types.js";
import { getDateString } from "../lib/helpers.js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteTimeEntry, fetchUserTimeEntries } from "../lib/redmine.js";
import { redmineAuth } from "../constants.js";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export const DeleteEntry = ({ args }: CommandsProps) => {
  const [arg1] = args ?? [];
  const daysAgoDelete = arg1 ? parseInt(arg1) : 0;
  const date = getDateString(daysAgoDelete);

  const {
    data = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["delete", date],
    queryFn: () => {
      // Implement the delete logic here
      return fetchUserTimeEntries(redmineAuth, date);
    },
  });

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationKey: ["delete", date],
    mutationFn: async (id: number) => {
      await deleteTimeEntry(id, redmineAuth);
    },
    onSuccess: () => {
      refetch();
    },
  });

  const options = data.map((entry, idx) => {
    return {
      key: `${entry.issue.id}-${idx}`,
      value: entry.id,
      label: `Issue #${entry.issue.id}: ${entry.hours}h - ${entry.comments}`,
    };
  });

  const handleSelect = (item: { value: number }) => {
    mutate(item.value);
  };

  const isEmpty = options.length === 0;

  return (
    <Box flexDirection="column">
      {isFetching && <Text color="yellow">Fetching entries...</Text>}
      {!isFetching && isEmpty && <Text color="red">No entries found</Text>}
      {!isEmpty && (
        <Fragment>
          <Text color="red">Select entry to delete:</Text>
          <SelectInput items={options} onSelect={handleSelect} />
        </Fragment>
      )}
      {isError && <Text color="red">{`Error: ${error.message}`}</Text>}
      {isPending && <Text color="yellow">Deleting...</Text>}
      {isSuccess && <Text color="green">Entry deleted successfully</Text>}
    </Box>
  );
};
