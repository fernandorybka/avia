import { BudgetItemsView } from "@/components/projects/BudgetItemsView";
import { requireOwnedProjectForRender } from "@/lib/project-guard";
import { getProjectData } from "@/services/project-services";

export default async function ProjectBudgetItemsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, project } = await requireOwnedProjectForRender(id);
  const data = await getProjectData(project.id, userId);

  return <BudgetItemsView projectId={project.id} data={data} />;
}
