import { PageSkeleton } from "@/components/PageSkeleton";

// Each tab needs its own boundary so navigating to it renders at once (cacheComponents)
export default function Loading() {
  return <PageSkeleton framed={false} />;
}
