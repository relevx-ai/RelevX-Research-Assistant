import { TouchableOpacity, Text, Alert, Image } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

// Configure Google Sign-In — webClientId comes from Firebase Console > Authentication > Google provider
// iosClientId comes from GoogleService-Info.plist CLIENT_ID
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export function GoogleSignInButton() {
  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error("No ID token returned from Google");
      }

      // Create Firebase credential
      const firebaseCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign in with Firebase
      await auth().signInWithCredential(firebaseCredential);
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return;
      }
      console.error("Google Sign-In error:", error);
      Alert.alert(
        "Sign In Failed",
        "Could not sign in with Google. Please try again."
      );
    }
  };

  return (
    <TouchableOpacity
      className="w-full flex-row items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3.5 dark:border-gray-600 dark:bg-gray-800"
      onPress={handleGoogleSignIn}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: "https://developers.google.com/identity/images/g-logo.png",
        }}
        className="mr-3 h-5 w-5"
      />
      <Text className="text-base font-semibold text-gray-800 dark:text-gray-100">
        Sign in with Google
      </Text>
    </TouchableOpacity>
  );
}
