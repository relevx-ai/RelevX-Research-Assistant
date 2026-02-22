import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  useColorScheme,
} from "react-native";
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_REGIONS,
  OUTPUT_LANGUAGES,
} from "@/lib/constants/languages";

interface AdvancedSettingsSectionProps {
  isPro: boolean;
  priorityDomains: string;
  excludedDomains: string;
  requiredKeywords: string;
  excludedKeywords: string;
  language: string;
  region: string;
  outputLanguage: string;
  onChangePriorityDomains: (v: string) => void;
  onChangeExcludedDomains: (v: string) => void;
  onChangeRequiredKeywords: (v: string) => void;
  onChangeExcludedKeywords: (v: string) => void;
  onChangeLanguage: (v: string) => void;
  onChangeRegion: (v: string) => void;
  onChangeOutputLanguage: (v: string) => void;
}

function PickerField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { code: string; name: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const selected = options.find((o) => o.code === value);

  return (
    <>
      <TouchableOpacity
        className={`rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-700 ${disabled ? "opacity-50" : ""}`}
        onPress={() => !disabled && setVisible(true)}
        disabled={disabled}
      >
        <Text className="text-sm text-slate-800 dark:text-slate-200">
          {selected?.name || label}
        </Text>
      </TouchableOpacity>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-white dark:bg-slate-900">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
            <Text className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {label}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text className="font-medium text-brand-600">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.code || "_empty"}
            renderItem={({ item }) => (
              <TouchableOpacity
                className={`border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 ${
                  value === item.code ? "bg-brand-50 dark:bg-brand-950" : ""
                }`}
                onPress={() => {
                  onChange(item.code);
                  setVisible(false);
                }}
              >
                <Text
                  className={`text-sm ${
                    value === item.code
                      ? "font-semibold text-brand-600"
                      : "text-slate-800 dark:text-slate-200"
                  }`}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

export function AdvancedSettingsSection({
  isPro,
  priorityDomains,
  excludedDomains,
  requiredKeywords,
  excludedKeywords,
  language,
  region,
  outputLanguage,
  onChangePriorityDomains,
  onChangeExcludedDomains,
  onChangeRequiredKeywords,
  onChangeExcludedKeywords,
  onChangeLanguage,
  onChangeRegion,
  onChangeOutputLanguage,
}: AdvancedSettingsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View>
      <TouchableOpacity
        className="flex-row items-center justify-between py-2"
        onPress={() => setExpanded(!expanded)}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Advanced Settings
          </Text>
          {!isPro && (
            <View className="rounded-full bg-yellow-100 px-2 py-0.5 dark:bg-yellow-900">
              <Text className="text-xs text-yellow-700 dark:text-yellow-300">
                Pro
              </Text>
            </View>
          )}
        </View>
        <Text className="text-slate-400">{expanded ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-2 gap-4">
          {!isPro && (
            <Text className="text-xs text-slate-400 dark:text-slate-500">
              Upgrade to Pro to customize search filters, languages, and regions.
            </Text>
          )}

          {/* Priority domains */}
          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Priority Domains
            </Text>
            <TextInput
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200"
              placeholder="e.g., reuters.com, techcrunch.com"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={priorityDomains}
              onChangeText={onChangePriorityDomains}
              editable={isPro}
              multiline
            />
          </View>

          {/* Excluded domains */}
          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Excluded Domains
            </Text>
            <TextInput
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200"
              placeholder="e.g., spam-site.com"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={excludedDomains}
              onChangeText={onChangeExcludedDomains}
              editable={isPro}
              multiline
            />
          </View>

          {/* Required keywords */}
          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Keywords to Search For
            </Text>
            <TextInput
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200"
              placeholder="e.g., machine learning, neural networks"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={requiredKeywords}
              onChangeText={onChangeRequiredKeywords}
              editable={isPro}
              multiline
            />
          </View>

          {/* Excluded keywords */}
          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Excluded Keywords
            </Text>
            <TextInput
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-800 dark:bg-slate-700 dark:text-slate-200"
              placeholder="e.g., sponsored, advertisement"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              value={excludedKeywords}
              onChangeText={onChangeExcludedKeywords}
              editable={isPro}
              multiline
            />
          </View>

          {/* Language pickers */}
          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Search Language
            </Text>
            <PickerField
              label="Search Language"
              value={language}
              options={SUPPORTED_LANGUAGES}
              onChange={onChangeLanguage}
              disabled={!isPro}
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Search Region
            </Text>
            <PickerField
              label="Search Region"
              value={region}
              options={SUPPORTED_REGIONS}
              onChange={onChangeRegion}
              disabled={!isPro}
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
              Report Language
            </Text>
            <PickerField
              label="Report Language"
              value={outputLanguage}
              options={OUTPUT_LANGUAGES}
              onChange={onChangeOutputLanguage}
              disabled={!isPro}
            />
          </View>
        </View>
      )}
    </View>
  );
}
