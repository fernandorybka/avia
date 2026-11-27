import { BudgetImport } from "@/components/projects/BudgetImport";
import { getBudgetPageData, getOwnedProjectDataForRender } from "@/services/project-services";

export default async function ProjectBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Ownership is checked inside the batched read; the budget versions are only read after it
  const { projectId, data } = await getOwnedProjectDataForRender(id);
  const page = await getBudgetPageData(projectId);

  const currentItems = data.items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    plannedCents: item.plannedCents,
    paidCents: item.paidCents,
    paymentCount: item.paymentCount,
    status: item.status,
  }));

  return <BudgetImport projectId={projectId} page={page} currentItems={currentItems} />;
}
