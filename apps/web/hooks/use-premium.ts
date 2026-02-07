import { useAuth } from '@/contexts/auth-context';

// Must match gFreePlanId in apps/backend/src/utils/billing.ts
const FREE_PLAN_ID = "7DZCFp1BMWuvtjroefNn";

export function usePremium() {
  const { userProfile } = useAuth();
  const isPremium = !!userProfile && userProfile.planId !== FREE_PLAN_ID;

  return { isPremium };
}
