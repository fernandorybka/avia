import { Suspense } from "react";
import { PaymentTimeline } from "@/components/projects/PaymentTimeline";
import { requireOwnedProjectForRender } from "@/lib/project-guard";
import { getProjectData } from "@/services/project-services";

export default async function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, project } = await requireOwnedProjectForRender(id);
  const data = await getProjectData(project.id, userId);

  return (
    <Suspense>
      <PaymentTimeline projectId={project.id} data={data} />
    </Suspense>
  );
}
