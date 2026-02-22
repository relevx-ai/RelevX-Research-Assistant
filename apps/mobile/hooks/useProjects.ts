import { useState, useEffect, useCallback } from "react";
import { listProjects } from "@/lib/projects";
import type { ProjectInfo } from "core";

export function useProjects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setError(null);
      const data = await listProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refreshing, refresh, setProjects };
}
