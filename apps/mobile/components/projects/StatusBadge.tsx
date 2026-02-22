import { View, Text } from "react-native";
import type { ProjectStatus } from "core";

const statusConfig: Record<
  ProjectStatus,
  { label: string; bg: string; text: string; darkBg: string; darkText: string }
> = {
  active: {
    label: "Active",
    bg: "bg-green-100",
    text: "text-green-700",
    darkBg: "dark:bg-green-900",
    darkText: "dark:text-green-300",
  },
  paused: {
    label: "Paused",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    darkBg: "dark:bg-yellow-900",
    darkText: "dark:text-yellow-300",
  },
  running: {
    label: "Running",
    bg: "bg-blue-100",
    text: "text-blue-700",
    darkBg: "dark:bg-blue-900",
    darkText: "dark:text-blue-300",
  },
  error: {
    label: "Error",
    bg: "bg-red-100",
    text: "text-red-700",
    darkBg: "dark:bg-red-900",
    darkText: "dark:text-red-300",
  },
};

interface StatusBadgeProps {
  status: ProjectStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.paused;

  return (
    <View
      className={`rounded-full px-2.5 py-0.5 ${config.bg} ${config.darkBg}`}
    >
      <Text className={`text-xs font-medium ${config.text} ${config.darkText}`}>
        {config.label}
      </Text>
    </View>
  );
}
