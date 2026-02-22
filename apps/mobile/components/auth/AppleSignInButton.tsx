import { View, Alert } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import auth from "@react-native-firebase/auth";

export function AppleSignInButton() {
  const handleAppleSignIn = async () => {
    try {
      // Generate a nonce for security
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error("No identity token returned from Apple");
      }

      // Create Firebase credential with the Apple identity token
      const firebaseCredential = auth.AppleAuthProvider.credential(
        identityToken,
        rawNonce
      );

      // Sign in with Firebase
      await auth().signInWithCredential(firebaseCredential);
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User cancelled — do nothing
        return;
      }
      console.error("Apple Sign-In error:", error);
      Alert.alert("Sign In Failed", "Could not sign in with Apple. Please try again.");
    }
  };

  return (
    <View className="w-full">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={12}
        style={{ width: "100%", height: 50 }}
        onPress={handleAppleSignIn}
      />
    </View>
  );
}
