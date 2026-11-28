import { BudgetItemsSkeleton } from "@/components/projects/ProjectSkeletons";

// Each tab needs its own boundary so navigating to it renders at once (cacheComponents)
export default function Loading() {
  return <BudgetItemsSkeleton />;
}
