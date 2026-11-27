import { Suspense } from "react";
import { PaymentTimeline } from "@/components/projects/PaymentTimeline";
import { getOwnedProjectDataForRender } from "@/services/project-services";

export default async function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { projectId, data } = await getOwnedProjectDataForRender(id);

  return (
    <Suspense>
      <PaymentTimeline projectId={projectId} data={data} />
    </Suspense>
  );
}
