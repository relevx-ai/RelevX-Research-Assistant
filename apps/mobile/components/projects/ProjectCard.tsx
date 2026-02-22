import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StatusBadge } from "./StatusBadge";
import type { ProjectInfo } from "core";

interface ProjectCardProps {
  project: ProjectInfo;
  onLongPress?: () => void;
}

function formatFrequency(freq: string): string {
  return freq.charAt(0).toUpperCase() + freq.slice(1);
}

function formatNextRun(nextRunAt?: number): string {
  if (!nextRunAt) return "Not scheduled";
  const date = new Date(nextRunAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "Overdue";
  if (diffMs < 3600000) return `${Math.round(diffMs / 60000)}m`;
  if (diffMs < 86400000) return `${Math.round(diffMs / 3600000)}h`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ProjectCard({ project, onLongPress }: ProjectCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="mx-4 mb-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-800"
      activeOpacity={0.7}
      onPress={() =>
        router.push({
          pathname: "/(tabs)/projects/[title]",
          params: { title: project.title },
        })
      }
      onLongPress={onLongPress}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
            numberOfLines={1}
          >
            {project.title}
          </Text>
          <Text
            className="mt-1 text-sm text-slate-500 dark:text-slate-400"
            numberOfLines={2}
          >
            {project.description}
          </Text>
        </View>
        <StatusBadge status={project.status} />
      </View>

      <View className="mt-3 flex-row items-center">
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {formatFrequency(project.frequency)}
        </Text>
        <Text className="mx-2 text-xs text-slate-300 dark:text-slate-600">
          ·
        </Text>
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          Next: {formatNextRun(project.nextRunAt)}
        </Text>
        {project.deliveryTime && (
          <>
            <Text className="mx-2 text-xs text-slate-300 dark:text-slate-600">
              ·
            </Text>
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              {project.deliveryTime}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}
