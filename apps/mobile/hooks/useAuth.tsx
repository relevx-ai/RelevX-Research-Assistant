import React, { createContext, useContext, useEffect, useState } from "react";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { auth } from "@/lib/firebase";
import { syncUserProfile } from "@/lib/auth";
import type { RelevxUser } from "core";

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  userProfile: RelevxUser | null;
  loading: boolean;
  reloadUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [userProfile, setUserProfile] = useState<RelevxUser | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadUser = React.useCallback(async () => {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const response = await syncUserProfile();
    const profile: RelevxUser = {
      ...response,
      uid: currentUser.uid,
    };
    setUserProfile(profile);
  }, []);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (newUser) => {
      if (newUser) {
        try {
          const response = await syncUserProfile();
          const profile: RelevxUser = {
            ...response,
            uid: newUser.uid,
          };
          setUserProfile(profile);
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setUser(newUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = React.useMemo(
    () => ({ user, userProfile, loading, reloadUser }),
    [user, userProfile, loading, reloadUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
