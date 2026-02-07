import { useAuth } from '@/contexts/auth-context';

const FREE_PLAN_ID = "7DZCFp1BMWuvtjroefNn";

export function usePremium() {
  const { userProfile } = useAuth();
  const isPremium = userProfile?.planId !== FREE_PLAN_ID;

  return { isPremium };
}
