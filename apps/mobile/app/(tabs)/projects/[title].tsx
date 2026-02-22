import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProjects } from "@/hooks/useProjects";
import { useDeliveryLogs } from "@/hooks/useDeliveryLogs";
import { useUsage } from "@/hooks/useUsage";
import { StatusBadge } from "@/components/projects/StatusBadge";
import { DeliveryLogCard } from "@/components/projects/DeliveryLogCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  updateProjectStatus,
  deleteProject,
  runProjectNow,
  createProject,
} from "@/lib/projects";
import type { ProjectInfo } from "core";

function formatDate(dateStr?: string | number): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNextRun(nextRunAt?: number): string {
  if (!nextRunAt) return "Not scheduled";
  const date = new Date(nextRunAt);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProjectDetailScreen() {
  const { title } = useLocalSearchParams<{ title: string }>();
  const router = useRouter();
  const { projects, refresh: refreshProjects } = useProjects();
  const { logs, loading: logsLoading, error: logsError, loadMore, refresh: refreshLogs } =
    useDeliveryLogs(title);
  const { reload: reloadUsage } = useUsage();
  const [refreshing, setRefreshing] = useState(false);

  const project = projects.find((p) => p.title === title);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshProjects(), refreshLogs()]);
    setRefreshing(false);
  }, [refreshProjects, refreshLogs]);

  const showActions = () => {
    if (!project) return;
    const isActive = project.status === "active";
    const toggleLabel = isActive ? "Pause" : "Activate";
    const actions = [toggleLabel, "Run Now", "Edit", "Duplicate", "Delete", "Cancel"];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: actions,
          destructiveButtonIndex: 4,
          cancelButtonIndex: 5,
        },
        async (idx) => handleAction(idx)
      );
    } else {
      Alert.alert("Actions", undefined, [
        { text: toggleLabel, onPress: () => handleAction(0) },
        { text: "Run Now", onPress: () => handleAction(1) },
        { text: "Edit", onPress: () => handleAction(2) },
        { text: "Duplicate", onPress: () => handleAction(3) },
        { text: "Delete", style: "destructive", onPress: () => handleAction(4) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleAction = async (idx: number) => {
    if (!project) return;
    try {
      switch (idx) {
        case 0: {
          const newStatus = project.status === "active" ? "paused" : "active";
          await updateProjectStatus(project.title, newStatus as "active" | "paused");
          refreshProjects();
          reloadUsage();
          break;
        }
        case 1: {
          const result = await runProjectNow(project.title);
          Alert.alert(
            "Run Scheduled",
            `Research will begin shortly.\n${result.remainingRuns} of ${result.monthlyLimit} runs remaining.`
          );
          refreshProjects();
          break;
        }
        case 2:
          router.push({
            pathname: "/(tabs)/projects/edit",
            params: { title: project.title, data: JSON.stringify(project) },
          });
          break;
        case 3: {
          await createProject({
            title: `${project.title} (Copy)`,
            description: project.description,
            frequency: project.frequency,
            resultsDestination: project.resultsDestination,
            deliveryTime: project.deliveryTime,
            timezone: project.timezone,
            searchParameters: project.searchParameters,
            settings: project.settings,
            deliveryConfig: project.deliveryConfig,
            dayOfWeek: project.dayOfWeek,
            dayOfMonth: project.dayOfMonth,
          });
          refreshProjects();
          reloadUsage();
          Alert.alert("Duplicated", "Project has been duplicated.");
          break;
        }
        case 4: {
          const confirmed = await showConfirmDialog({
            title: "Delete Project",
            message: `Delete "${project.title}"? This cannot be undone.`,
            confirmLabel: "Delete",
            destructive: true,
          });
          if (confirmed) {
            await deleteProject(project.title);
            refreshProjects();
            reloadUsage();
            router.back();
          }
          break;
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={["bottom"]}>
        <LoadingSpinner message="Loading project..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Project overview */}
        <View className="mx-4 mt-4 rounded-2xl bg-white p-4 dark:bg-slate-800">
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-xl font-bold text-slate-900 dark:text-slate-100">
              {project.title}
            </Text>
            <StatusBadge status={project.status} />
          </View>

          <Text className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {project.description}
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-x-6 gap-y-2">
            <View>
              <Text className="text-xs text-slate-400">Frequency</Text>
              <Text className="text-sm font-medium capitalize text-slate-700 dark:text-slate-300">
                {project.frequency}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-slate-400">Delivery Time</Text>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {project.deliveryTime || "N/A"}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-slate-400">Timezone</Text>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {project.timezone}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row flex-wrap gap-x-6 gap-y-2">
            <View>
              <Text className="text-xs text-slate-400">Next Run</Text>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatNextRun(project.nextRunAt)}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-slate-400">Created</Text>
              <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {formatDate(project.createdAt)}
              </Text>
            </View>
          </View>

          {project.lastError && (
            <View className="mt-3 rounded-lg bg-red-50 p-3 dark:bg-red-950">
              <Text className="text-xs text-red-600 dark:text-red-400">
                {project.lastError}
              </Text>
            </View>
          )}

          {/* Actions button */}
          <TouchableOpacity
            className="mt-4 items-center rounded-xl bg-brand-600 py-3"
            onPress={showActions}
            activeOpacity={0.7}
          >
            <Text className="font-semibold text-white">Actions</Text>
          </TouchableOpacity>
        </View>

        {/* Delivery history */}
        <View className="mt-6">
          <Text className="mx-4 mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">
            Delivery History
          </Text>

          {logsError && (
            <ErrorBanner message={logsError} onRetry={refreshLogs} />
          )}

          {logsLoading ? (
            <LoadingSpinner message="Loading deliveries..." />
          ) : logs.length === 0 ? (
            <View className="mx-4 items-center rounded-2xl bg-white py-8 dark:bg-slate-800">
              <Text className="text-sm text-slate-400">
                No deliveries yet. Reports will appear here after each run.
              </Text>
            </View>
          ) : (
            <>
              {logs.map((log, index) => (
                <DeliveryLogCard
                  key={`${log.reportTitle}-${index}`}
                  log={log}
                  timezone={project.timezone}
                />
              ))}
              {loadMore && (
                <TouchableOpacity
                  className="mx-4 mt-2 items-center rounded-xl bg-slate-100 py-3 dark:bg-slate-800"
                  onPress={loadMore}
                  activeOpacity={0.7}
                >
                  <Text className="text-sm font-medium text-brand-600">
                    Load More
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
