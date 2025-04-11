#!/usr/bin/env node

import React, { JSX, useState } from "react";
import { Box, render, Text } from "ink";
import { Help } from "./components/Help.js";
import { Entries } from "./components/Entries.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandsProps } from "./components/types.js";
import { Search } from "./components/Search.js";
import { Toggle } from "./components/Toggle.js";
import { MonthlySummary } from "./components/MonthlySummary.js";
import { DeleteEntry } from "./components/DeleteEntry.js";
import { CreateTask } from "./components/CreateTask.js";
import SelectInput from "ink-select-input";
import { init } from "./constants.js";

init();

const OutputMap: Record<string, (props: CommandsProps) => JSX.Element> = {
  "--help": Help,
  "-h": Help,
  "get-entries": Entries,
  search: Search,
  toggle: Toggle,
  "print-monthly-summary": MonthlySummary,
  delete: DeleteEntry,
  "create-task": CreateTask,
};

const App = () => {
  const [command, ...args] = process.argv.slice(2);
  const [selectedCommand, setCommand] = useState(command);

  if (!selectedCommand) {
    const options = Object.keys(OutputMap).map((key) => {
      return {
        value: key,
        label: key,
      };
    });
    return (
      <Box flexDirection="column">
        <Text color="green">Select a command:</Text>
        <SelectInput
          items={options}
          onSelect={(i) => {
            setCommand(i.value);
          }}
        />
      </Box>
    );
  }

  const Component =
    OutputMap[selectedCommand as any] || (() => <Text>Invalid command</Text>);

  return <Component args={args} />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Optional: exponential backoff
    },
  },
});

render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
