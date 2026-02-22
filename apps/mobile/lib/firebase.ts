/**
 * Firebase initialization for React Native
 *
 * @react-native-firebase reads config from GoogleService-Info.plist (iOS)
 * and google-services.json (Android) automatically — no manual config needed.
 */

import firebase from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";

export { firebase, auth };
