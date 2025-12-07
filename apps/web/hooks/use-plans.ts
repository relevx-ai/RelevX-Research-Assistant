/**
 * usePlans web hook
 *
 * Provides real-time access to plans.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  fetchPlans,
} from "@/lib/plans";
import { PlanInfo } from "core";

interface UsePlansResult {
  plans: PlanInfo[];
  loading: boolean;
  error: string | null;
}

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const loadPlans = async () => {
      // Wait for auth to initialize
      if (authLoading) return;

      if (!user) {
        // If auth finished loading but no user, we might want to fail or just return empty
        // Assuming plans require auth, we stop here.
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const plans = await fetchPlans();
        if (plans) {
          setPlans(plans);
          console.log(plans);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("Failed to fetch plans");
        setPlans([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [user, authLoading]);

  return { plans, loading, error };
}
