import { TimelineSkeleton } from "@/components/projects/ProjectSkeletons";

// Switching tabs keeps the project header and shows this under it while the tab's data loads
export default function ProjectTabLoading() {
  return <TimelineSkeleton />;
}
