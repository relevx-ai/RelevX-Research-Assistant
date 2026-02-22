import { View, Text, TouchableOpacity } from "react-native";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-4 text-5xl">{icon}</Text>
      <Text className="mb-2 text-center text-lg font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </Text>
      <Text className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          className="rounded-xl bg-brand-600 px-6 py-3"
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
