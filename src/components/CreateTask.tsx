import { Box, Text, useApp } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import SelectInput from "ink-select-input";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchAllProjects } from "../lib/redmine.js";
import { redmineAuth } from "../constants.js";
import { fetchJSON, validateAndAdjustRedmineUrl } from "../lib/helpers.js";
import { createBasicAuth } from "../lib/auth.js";
import { ConfirmInput } from "./ConfirmInput.js";

const taskOptions = [
  { label: "Task", value: "Task" },
  { label: "Bug", value: "Bug" },
];

const defaultProjectId = process.env.DEFAULT_PROJECT;

export const CreateTask = () => {
  const [isAskedAboutDefaultProject, setIsAskedAboutDefaultProject] =
    useState(false);
  const [projectId, setProjectId] = useState<string | undefined>();
  const [taskName, setTaskName] = useState("");
  const [submittedTaskName, setSubmittedTaskName] = useState("");
  const [taskType, setTaskType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const { exit } = useApp();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return fetchAllProjects(redmineAuth);
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
        (project) => project.name === projectId
      );
      if (!selectedProject) {
        throw new Error("Project not found");
      }
      const issueData = {
        issue: {
          project_id: selectedProject.id,
          subject: name,
          tracker_id: type,
          description: description,
        },
      };
      const { issue } = await fetchJSON(
        `${validateAndAdjustRedmineUrl(
          process.env.REDMINE_API_URL!
        )}issues.json`,
        {
          method: "POST",
          headers: {
            Authorization: createBasicAuth(redmineAuth),
          },
          body: JSON.stringify(issueData),
        }
      );
      console.log(`Task created successfully with ID #${issue.id}`);
    },
    onSuccess: () => {
      exit();
    },
  });

  if (!isAskedAboutDefaultProject) {
    return (
      <Box>
        <Text>Use default project? (y/n)</Text>
        <ConfirmInput
          onPress={(checked) => {
            if (checked) {
              setProjectId(defaultProjectId);
            }
            setIsAskedAboutDefaultProject(true);
          }}
        />
      </Box>
    );
  }

  if (!projectId) {
    const options = projects.map((project) => {
      return {
        value: project.name,
        label: project.name,
      };
    });
    return (
      <Box flexDirection="column">
        {!projectId && !defaultProjectId && (
          <Text color="red">Default project not found please select one:</Text>
        )}
        <SelectInput
          limit={10}
          items={options}
          onSelect={(item) => {
            setProjectId(item.value);
          }}
        />
      </Box>
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
