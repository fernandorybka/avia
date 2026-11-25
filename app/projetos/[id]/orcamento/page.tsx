import { BudgetImport } from "@/components/projects/BudgetImport";
import { requireOwnedProjectForRender } from "@/lib/project-guard";
import { getBudgetPageData, getProjectData } from "@/services/project-services";

export default async function ProjectBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, project } = await requireOwnedProjectForRender(id);
  const [page, data] = await Promise.all([getBudgetPageData(project.id), getProjectData(project.id, userId)]);

  const currentItems = data.items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    plannedCents: item.plannedCents,
    paidCents: item.paidCents,
    paymentCount: item.paymentCount,
    status: item.status,
  }));

  return <BudgetImport projectId={project.id} page={page} currentItems={currentItems} />;
}
