import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";

// Each tab needs its own boundary so navigating to it renders at once (cacheComponents)
export default function Loading() {
  return <ProjectsSkeleton />;
}
