import { AdminHomeSkeleton } from "@/components/PageSkeleton";

// The page reads per-request data (session, permissions); this boundary lets navigation render at once
export default function Loading() {
  return <AdminHomeSkeleton />;
}
