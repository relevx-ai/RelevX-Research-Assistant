import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function AccountLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        },
        headerTintColor: isDark ? "#f8fafc" : "#0f172a",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Account" }} />
    </Stack>
  );
}
