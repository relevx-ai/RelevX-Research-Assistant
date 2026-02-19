import { useState, useEffect, useCallback } from "react";
import { fetchUsage } from "@/lib/projects";

interface UseUsageResult {
  maxActiveProjects: number;
  oneShotRunsUsed: number;
  oneShotRunsLimit: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUsage(): UseUsageResult {
  const [maxActiveProjects, setMaxActiveProjects] = useState(0);
  const [oneShotRunsUsed, setOneShotRunsUsed] = useState(0);
  const [oneShotRunsLimit, setOneShotRunsLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsage();
      setMaxActiveProjects(data.maxActiveProjects);
      setOneShotRunsUsed(data.oneShotRunsUsed);
      setOneShotRunsLimit(data.oneShotRunsLimit);
    } catch (err) {
      console.error("Error fetching usage:", err);
      setError("Failed to fetch usage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    maxActiveProjects,
    oneShotRunsUsed,
    oneShotRunsLimit,
    loading,
    error,
    refresh: load,
  };
}
