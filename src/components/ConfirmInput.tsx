import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import React, { useState } from "react";

export const ConfirmInput = ({
  onPress,
}: {
  onPress: (isChecked: boolean) => void;
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const handleChange = (value: string) => {
    setValue(value);
  };
  const lowerValue = value.toLowerCase();
  const handleSubmit = () => {
    const positiveResponse = ["y", "yes"];
    const negativeResponse = ["n", "no"];
    setError(null);
    if (positiveResponse.includes(lowerValue)) {
      onPress(true);
    } else if (negativeResponse.includes(lowerValue)) {
      onPress(false);
    } else {
      setError("Please enter 'y' or 'n'");
    }
  };
  return (
    <Box flexDirection="column">
      <TextInput
        value={value}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
      {error && <Text>{error}</Text>}
    </Box>
  );
};
