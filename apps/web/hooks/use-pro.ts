import { useAuth } from '@/contexts/auth-context';

export function usePro() {
  const { userProfile } = useAuth();
  const isPro = !!userProfile?.isPro;

  return { isPro };
}
