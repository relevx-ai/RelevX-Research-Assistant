import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { FrequencyPicker } from "./FrequencyPicker";
import { ScheduleSection } from "./ScheduleSection";
import { AdvancedSettingsSection } from "./AdvancedSettingsSection";
import { usePro } from "@/hooks/usePro";
import { createProject, updateProject, improveProjectDescription } from "@/lib/projects";
import type { ProjectInfo, Frequency, NewProject } from "core";

function parseList(str: string): string[] {
  return str
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function arrayToString(arr?: string[]): string {
  return arr?.join(", ") || "";
}

interface ProjectFormProps {
  project?: ProjectInfo;
  onSuccess?: () => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const { isPro } = usePro();
  const isEditMode = !!project;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Default timezone to device's timezone
  const defaultTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";

  // Form state
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [frequency, setFrequency] = useState<Frequency>(
    project?.frequency || "daily"
  );
  const [deliveryTime, setDeliveryTime] = useState(
    project?.deliveryTime || "09:00"
  );
  const [timezone, setTimezone] = useState(
    project?.timezone || defaultTimezone
  );
  const [dayOfWeek, setDayOfWeek] = useState(project?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(project?.dayOfMonth ?? 1);

  // Advanced settings
  const [priorityDomains, setPriorityDomains] = useState(
    arrayToString(project?.searchParameters?.priorityDomains)
  );
  const [excludedDomains, setExcludedDomains] = useState(
    arrayToString(project?.searchParameters?.excludedDomains)
  );
  const [requiredKeywords, setRequiredKeywords] = useState(
    arrayToString(project?.searchParameters?.requiredKeywords)
  );
  const [excludedKeywords, setExcludedKeywords] = useState(
    arrayToString(project?.searchParameters?.excludedKeywords)
  );
  const [language, setLanguage] = useState(
    project?.searchParameters?.language || ""
  );
  const [region, setRegion] = useState(
    project?.searchParameters?.region || ""
  );
  const [outputLanguage, setOutputLanguage] = useState(
    project?.searchParameters?.outputLanguage || ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnhance = async () => {
    if (!description.trim()) {
      Alert.alert("Enter a description first");
      return;
    }
    setIsEnhancing(true);
    try {
      const improved = await improveProjectDescription(description);
      Alert.alert("AI Enhancement", improved, [
        { text: "Discard", style: "cancel" },
        { text: "Use This", onPress: () => setDescription(improved) },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to enhance description");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (description.length > 2000) {
      setError("Description must be under 2000 characters");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const searchParameters = isPro
        ? {
            priorityDomains: parseList(priorityDomains),
            excludedDomains: parseList(excludedDomains),
            requiredKeywords: parseList(requiredKeywords),
            excludedKeywords: parseList(excludedKeywords),
            language: language || undefined,
            region: region || undefined,
            outputLanguage: outputLanguage || undefined,
          }
        : undefined;

      if (isEditMode) {
        await updateProject(project!.title, {
          title: title.trim(),
          description: description.trim(),
          frequency,
          deliveryTime,
          timezone,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
          searchParameters,
        });
      } else {
        const newProject: NewProject = {
          title: title.trim(),
          description: description.trim(),
          frequency,
          resultsDestination: "email",
          deliveryTime,
          timezone,
          dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
          dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
          searchParameters,
          settings: {
            relevancyThreshold: 60,
            minResults: 5,
            maxResults: 20,
          },
        };
        const response = await createProject(newProject);
        if (response.createdAsPaused) {
          Alert.alert(
            "Project Created as Paused",
            `You've reached the limit of ${response.maxActiveProjects} active projects on your plan. The project was created but is paused.`
          );
        }
      }

      onSuccess?.();
      router.back();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ScrollView
        className="flex-1 bg-slate-50 dark:bg-slate-900"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View className="mb-4 rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950">
            <Text className="text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
          </View>
        )}

        {/* Title */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Project Title
          </Text>
          <TextInput
            className="rounded-xl bg-white px-4 py-3 text-base text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            placeholder="e.g., AI Research Weekly"
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={title}
            onChangeText={setTitle}
            editable={!isSubmitting}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
              What to Research
            </Text>
            <Text className="text-xs text-slate-400">
              {description.length}/2000
            </Text>
          </View>
          <TextInput
            className="min-h-[100px] rounded-xl bg-white px-4 py-3 text-base text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            placeholder="Describe what you want to research..."
            placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            className="mt-2 flex-row items-center justify-center rounded-lg border border-brand-200 bg-brand-50 py-2 dark:border-brand-800 dark:bg-brand-950"
            onPress={handleEnhance}
            disabled={isEnhancing || isSubmitting}
            activeOpacity={0.7}
          >
            {isEnhancing ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text className="text-sm font-medium text-brand-600 dark:text-brand-400">
                ✨ Enhance with AI
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Frequency */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Frequency
          </Text>
          <FrequencyPicker
            value={frequency}
            onChange={setFrequency}
            disabled={isSubmitting || (isEditMode && project?.frequency === "once")}
          />
        </View>

        {/* Schedule */}
        <View className="mb-4">
          <ScheduleSection
            frequency={frequency}
            deliveryTime={deliveryTime}
            timezone={timezone}
            dayOfWeek={dayOfWeek}
            dayOfMonth={dayOfMonth}
            onChangeTime={setDeliveryTime}
            onChangeTimezone={setTimezone}
            onChangeDayOfWeek={setDayOfWeek}
            onChangeDayOfMonth={setDayOfMonth}
          />
        </View>

        {/* Advanced settings */}
        <View className="mb-4 rounded-2xl bg-white p-4 dark:bg-slate-800">
          <AdvancedSettingsSection
            isPro={isPro}
            priorityDomains={priorityDomains}
            excludedDomains={excludedDomains}
            requiredKeywords={requiredKeywords}
            excludedKeywords={excludedKeywords}
            language={language}
            region={region}
            outputLanguage={outputLanguage}
            onChangePriorityDomains={setPriorityDomains}
            onChangeExcludedDomains={setExcludedDomains}
            onChangeRequiredKeywords={setRequiredKeywords}
            onChangeExcludedKeywords={setExcludedKeywords}
            onChangeLanguage={setLanguage}
            onChangeRegion={setRegion}
            onChangeOutputLanguage={setOutputLanguage}
          />
        </View>
      </ScrollView>

      {/* Submit button */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-8 pt-4 dark:border-slate-700 dark:bg-slate-900">
        <TouchableOpacity
          className={`items-center rounded-xl py-3.5 ${
            isSubmitting ? "bg-brand-400" : "bg-brand-600"
          }`}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {isEditMode ? "Save Changes" : "Create Project"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
