import { useState, useEffect, useCallback } from "react";
import { getProjectDeliveryLogs } from "@/lib/projects";
import type { RelevxDeliveryLog, PaginationInfo } from "core";

const PAGE_SIZE = 5;

export function useDeliveryLogs(projectTitle: string) {
  const [logs, setLogs] = useState<RelevxDeliveryLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      try {
        setError(null);
        const response = await getProjectDeliveryLogs(
          projectTitle,
          PAGE_SIZE,
          offset
        );
        if (append) {
          setLogs((prev) => [...prev, ...response.logs]);
        } else {
          setLogs(response.logs);
        }
        setPagination(response.pagination ?? null);
      } catch (err: any) {
        setError(err.message || "Failed to load delivery logs");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [projectTitle]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const loadMore = useCallback(() => {
    if (!pagination?.hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchLogs(logs.length, true);
  }, [pagination, loadingMore, logs.length, fetchLogs]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchLogs(0, false);
  }, [fetchLogs]);

  return { logs, pagination, loading, loadingMore, error, loadMore, refresh };
}
