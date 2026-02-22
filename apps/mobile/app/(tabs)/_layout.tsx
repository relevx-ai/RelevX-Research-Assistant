import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useColorScheme } from "react-native";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    projects: "📋",
    account: "👤",
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || "•"}
    </Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: isDark ? "#94a3b8" : "#64748b",
        tabBarStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderTopColor: isDark ? "#1e293b" : "#e2e8f0",
        },
        headerStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
        },
        headerTintColor: isDark ? "#f8fafc" : "#0f172a",
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="projects" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="account" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
