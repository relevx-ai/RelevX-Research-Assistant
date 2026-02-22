import { View, Text, FlatList, TouchableOpacity, ActionSheetIOS, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProjects } from "@/hooks/useProjects";
import { useUsage } from "@/hooks/useUsage";
import { usePro } from "@/hooks/usePro";
import { ProjectCard } from "@/components/projects/ProjectCard";
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

export default function ProjectsScreen() {
  const router = useRouter();
  const { projects, loading, error, refreshing, refresh } = useProjects();
  const { usage, reload: reloadUsage } = useUsage();
  const { isPro } = usePro();

  const showProjectActions = (project: ProjectInfo) => {
    const isActive = project.status === "active";
    const toggleLabel = isActive ? "Pause" : "Activate";

    const actions = [
      toggleLabel,
      "Run Now",
      "Edit",
      "Duplicate",
      "Delete",
      "Cancel",
    ];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: project.title,
          options: actions,
          destructiveButtonIndex: 4,
          cancelButtonIndex: 5,
        },
        async (buttonIndex) => {
          await handleAction(project, buttonIndex);
        }
      );
    } else {
      // Fallback for Android
      Alert.alert(project.title, "Choose an action", [
        { text: toggleLabel, onPress: () => handleAction(project, 0) },
        { text: "Run Now", onPress: () => handleAction(project, 1) },
        { text: "Edit", onPress: () => handleAction(project, 2) },
        { text: "Duplicate", onPress: () => handleAction(project, 3) },
        { text: "Delete", style: "destructive", onPress: () => handleAction(project, 4) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const handleAction = async (project: ProjectInfo, actionIndex: number) => {
    try {
      switch (actionIndex) {
        case 0: {
          // Toggle status
          const newStatus = project.status === "active" ? "paused" : "active";
          await updateProjectStatus(project.title, newStatus as "active" | "paused");
          refresh();
          reloadUsage();
          break;
        }
        case 1: {
          // Run Now
          const result = await runProjectNow(project.title);
          Alert.alert(
            "Run Scheduled",
            `Research will begin shortly.\n${result.remainingRuns} of ${result.monthlyLimit} runs remaining this month.`
          );
          refresh();
          break;
        }
        case 2:
          // Edit
          router.push({
            pathname: "/(tabs)/projects/edit",
            params: { title: project.title, data: JSON.stringify(project) },
          });
          break;
        case 3: {
          // Duplicate
          const newProject = {
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
          };
          await createProject(newProject);
          refresh();
          reloadUsage();
          break;
        }
        case 4: {
          // Delete
          const confirmed = await showConfirmDialog({
            title: "Delete Project",
            message: `Are you sure you want to delete "${project.title}"? This cannot be undone.`,
            confirmLabel: "Delete",
            destructive: true,
          });
          if (confirmed) {
            await deleteProject(project.title);
            refresh();
            reloadUsage();
          }
          break;
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Something went wrong");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={["bottom"]}>
        <LoadingSpinner message="Loading projects..." />
      </SafeAreaView>
    );
  }

  const activeCount = projects.filter((p) => p.status === "active" || p.status === "running").length;
  const maxActive = usage?.maxActiveProjects ?? 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={["bottom"]}>
      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {/* Usage bar */}
      {usage && (
        <View className="mx-4 mt-2 mb-1 flex-row items-center justify-between">
          <Text className="text-xs text-slate-400 dark:text-slate-500">
            {activeCount}/{maxActive} active projects
            {!isPro && " · Free plan"}
          </Text>
          <Text className="text-xs text-slate-400 dark:text-slate-500">
            {usage.oneShotRunsUsed}/{usage.oneShotRunsLimit} runs used
          </Text>
        </View>
      )}

      {projects.length === 0 ? (
        <EmptyState
          icon="🔬"
          title="No projects yet"
          description="Create your first research project to start receiving AI-curated insights."
          actionLabel="Create Project"
          onAction={() => router.push("/(tabs)/projects/create")}
        />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onLongPress={() => showProjectActions(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={refresh}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg"
        onPress={() => router.push("/(tabs)/projects/create")}
        activeOpacity={0.8}
      >
        <Text className="text-2xl font-light text-white">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
