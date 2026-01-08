/**
 * useDeliveryLogs hook
 *
 * Fetches delivery logs for a specific project.
 */

import { useState, useEffect, useCallback } from "react";
import type { RelevxDeliveryLog } from "../../../packages/core/src/models/delivery-log";
import { getProjectDeliveryLogs } from "../lib/projects";
import { useAuth } from "../contexts/auth-context";

interface UseDeliveryLogsResult {
  logs: RelevxDeliveryLog[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDeliveryLogs(
  projectTitle: string | null
): UseDeliveryLogsResult {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RelevxDeliveryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!user?.uid || !projectTitle) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deliveryLogs = await getProjectDeliveryLogs(projectTitle);
      setLogs(deliveryLogs);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch delivery logs";
      setError(errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, projectTitle]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs,
  };
}
