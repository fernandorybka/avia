import { BudgetItemsView } from "@/components/projects/BudgetItemsView";
import { getOwnedProjectDataForRender } from "@/services/project-services";

export default async function ProjectBudgetItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { projectId, data } = await getOwnedProjectDataForRender(id);

  return <BudgetItemsView projectId={projectId} data={data} />;
}
