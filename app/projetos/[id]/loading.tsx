import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";

// Switching tabs keeps the project header and shows this under it while the tab's data loads
export default function ProjectTabLoading() {
  return <ProjectsSkeleton />;
}
