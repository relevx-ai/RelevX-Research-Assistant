import { useState, useEffect, useCallback } from "react";
import { fetchUsage, type UsageResponse } from "@/lib/projects";

export function useUsage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchUsage();
      setUsage(data);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { usage, loading, reload: load };
}
