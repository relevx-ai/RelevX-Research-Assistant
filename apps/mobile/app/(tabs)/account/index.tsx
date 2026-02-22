import { View, Text, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { useAuth } from "@/hooks/useAuth";
import { usePro } from "@/hooks/usePro";
import { signOut } from "@/lib/auth";
import { showConfirmDialog } from "@/components/ui/ConfirmDialog";

const BILLING_URL =
  process.env.EXPO_PUBLIC_WEB_URL || "https://relevx.ai/pricing";

export default function AccountScreen() {
  const { user, userProfile } = useAuth();
  const { isPro, planId } = usePro();

  const handleSignOut = async () => {
    const confirmed = await showConfirmDialog({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      destructive: true,
    });
    if (confirmed) {
      try {
        await signOut();
      } catch {
        Alert.alert("Error", "Failed to sign out. Please try again.");
      }
    }
  };

  const handleManageBilling = async () => {
    await WebBrowser.openBrowserAsync(BILLING_URL);
  };

  const displayName =
    userProfile?.displayName || user?.displayName || "User";
  const email = userProfile?.email || user?.email || "";
  const photoURL = userProfile?.photoURL || user?.photoURL;
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-900" edges={["bottom"]}>
      <View className="flex-1 px-4 pt-4">
        {/* Profile section */}
        <View className="items-center rounded-2xl bg-white p-6 dark:bg-slate-800">
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              className="mb-3 h-20 w-20 rounded-full"
            />
          ) : (
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
              <Text className="text-3xl font-bold text-brand-600 dark:text-brand-300">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {displayName}
          </Text>
          <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {email}
          </Text>
          <View
            className={`mt-3 rounded-full px-3 py-1 ${
              isPro
                ? "bg-brand-100 dark:bg-brand-900"
                : "bg-slate-100 dark:bg-slate-700"
            }`}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                isPro
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {planId} Plan
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="mt-4 rounded-2xl bg-white dark:bg-slate-800">
          <TouchableOpacity
            className="flex-row items-center justify-between border-b border-slate-100 px-4 py-4 dark:border-slate-700"
            onPress={handleManageBilling}
            activeOpacity={0.7}
          >
            <Text className="text-base text-slate-900 dark:text-slate-100">
              Manage Billing
            </Text>
            <Text className="text-slate-400">›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-4"
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text className="text-base text-red-600 dark:text-red-400">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View className="mt-auto items-center pb-4">
          <Text className="text-xs text-slate-400 dark:text-slate-600">
            RelevX v{appVersion}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
