import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function ProjectsLayout() {
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
      <Stack.Screen
        name="index"
        options={{ title: "Projects" }}
      />
      <Stack.Screen
        name="[title]"
        options={{ title: "Project Details" }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: "New Project",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          title: "Edit Project",
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
