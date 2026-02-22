import { View, Text, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppleSignInButton } from "@/components/auth/AppleSignInButton";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center px-8">
        {/* Logo / Branding */}
        <View className="mb-12 items-center">
          <Text className="text-4xl font-bold text-white">RelevX</Text>
          <Text className="mt-2 text-center text-base text-slate-400">
            AI-powered research, delivered on your schedule
          </Text>
        </View>

        {/* Sign-in buttons */}
        <View className="w-full max-w-sm gap-4">
          {Platform.OS === "ios" && <AppleSignInButton />}
          <GoogleSignInButton />
        </View>

        {/* Footer */}
        <Text className="mt-8 text-center text-xs text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}
