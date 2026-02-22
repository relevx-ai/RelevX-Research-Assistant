import { View, ActivityIndicator, Text } from "react-native";

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#3b82f6" />
      {message && (
        <Text className="mt-3 text-sm text-slate-400">{message}</Text>
      )}
    </View>
  );
}
