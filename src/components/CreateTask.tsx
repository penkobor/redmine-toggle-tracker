import { Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { CommandsProps } from "./types.js";
import SelectInput from "ink-select-input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAllProjects } from "../lib/redmine.js";
import { redmineClient } from "../constants.js";
import { createIssue } from "../api-redmine/sdk.gen.js";

const taskOptions = [
  { label: "Task", value: "Task" },
  { label: "Bug", value: "Bug" },
];

const defaultProjectId = process.env.DEFAULT_PROJECT;
export const CreateTask = ({ args }: CommandsProps) => {
  const [taskName, setTaskName] = useState("");
  const [submittedTaskName, setSubmittedTaskName] = useState("");
  const [taskType, setTaskType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const { exit } = useApp();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return fetchAllProjects(redmineClient);
    },
  });

  const { mutate, isPending, isSuccess, isError, error } = useMutation({
    mutationKey: ["createTask"],
    mutationFn: async ({
      name,
      type,
      description,
    }: {
      name: string;
      type: string;
      description?: string;
    }) => {
      const selectedProject = projects.find(
        (project) => project.name === defaultProjectId
      );
      if (!selectedProject) {
        throw new Error("Project not found");
      }
      const issueData = {
        issue: {
          project_id: selectedProject.id,
          subject: name,
          tracker_id: Number(type),
          description: description,
        },
      };
      const response = await createIssue({
        client: redmineClient,
        path: { format: "json" },
        body: issueData
      });
      if(response.error) {
        throw new Error(`Error creating task: ${response.error}`);
      }
      console.log(`Task created successfully with ID #${response.data!.issue.id}`);
    },
    onSuccess: () => {
      exit();
    },
  });

  if (!defaultProjectId) {
    return (
      <Text>
        Default project ID is not set. Please set the DEFAULT_PROJECT
        environment variable.
      </Text>
    );
  }

  if (isLoading) {
    return <Text>Loading projects...</Text>;
  }

  if (!submittedTaskName) {
    return (
      <TextInput
        placeholder="Enter task name"
        value={taskName}
        onChange={setTaskName}
        onSubmit={setSubmittedTaskName}
      />
    );
  }
  if (!taskType) {
    return (
      <SelectInput
        items={taskOptions}
        onSelect={(val) => {
          setTaskType(val.value);
        }}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <TextInput
        placeholder="Enter task description (optional)"
        value={description}
        onChange={setDescription}
        onSubmit={() => {
          mutate({
            name: submittedTaskName,
            type: taskType,
            description: description,
          });
        }}
      />
      {isError && <Text color="red">{error.message}</Text>}
      {isPending && <Text>Creating task...</Text>}
      {isSuccess && <Text color="green">Task created successfully</Text>}
    </Box>
  );
};
