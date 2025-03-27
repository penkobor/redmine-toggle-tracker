#!/usr/bin/env node

import React, { JSX } from "react";
import { render, Text } from "ink";
import { Help } from "./components/Help.js";
import { Entries } from "./components/Entries.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandsProps } from "./components/types.js";
import { Search } from "./components/Search.js";
import { togglAuth } from "./constants.js";
import { Toggle } from "./components/Toggle.js";
import { MonthlySummary } from "./components/MonthlySummary.js";
import { DeleteEntry } from "./components/DeleteEntry.js";
import { CreateTask } from "./components/CreateTask.js";

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

  const Component =
    OutputMap[command as any] || (() => <Text>Invalid command</Text>);

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
