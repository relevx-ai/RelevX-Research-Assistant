import { useAuth } from "./useAuth";

export function usePro() {
  const { userProfile } = useAuth();
  const isPro = userProfile?.isPro ?? false;
  const planId = userProfile?.planId ?? "free";
  return { isPro, planId };
}
