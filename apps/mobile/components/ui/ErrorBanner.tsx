import { View, Text, TouchableOpacity } from "react-native";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <View className="mx-4 mt-2 flex-row items-center rounded-xl bg-red-50 px-4 py-3 dark:bg-red-950">
      <Text className="flex-1 text-sm text-red-700 dark:text-red-300">
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} className="ml-3">
          <Text className="text-sm font-semibold text-red-600 dark:text-red-400">
            Retry
          </Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} className="ml-3">
          <Text className="text-sm text-red-500">✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
