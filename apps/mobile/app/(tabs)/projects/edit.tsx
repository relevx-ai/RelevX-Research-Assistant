import { useLocalSearchParams } from "expo-router";
import { ProjectForm } from "@/components/projects/ProjectForm";
import type { ProjectInfo } from "core";

export default function EditProjectScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();

  let project: ProjectInfo | undefined;
  try {
    project = data ? JSON.parse(data) : undefined;
  } catch {
    // Invalid data
  }

  if (!project) {
    return null;
  }

  return <ProjectForm project={project} />;
}
