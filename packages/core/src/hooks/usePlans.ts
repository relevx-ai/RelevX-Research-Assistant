/**
 * usePlans hook
 *
 * Provides real-time access to plans.
 */

import { useState, useEffect } from "react";
import type { PlanInfo } from "../models/plans";
import {
  fetchPlans,
} from "../services/plans";

interface UsePlansResult {
  plans: PlanInfo[];
  loading: boolean;
  error: string | null;
}

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      setError(null);

      const plans = await fetchPlans();
      if (plans) {
        setPlans(plans);

        console.log(plans);
      }
      else {
        setError("Failed to fetch plans");
        setPlans([]);
      }

      setLoading(false);
    };

    loadPlans();
  }, []);

  return { plans, loading, error };
}
