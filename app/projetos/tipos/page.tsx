import { PaymentTypesEditor } from "@/components/projects/PaymentTypesEditor";
import { PaymentTypesHeading } from "@/components/projects/ProjectsHeading";
import { requireProjectManager } from "@/lib/project-guard";
import { getPaymentTypes } from "@/services/project-services";

export default async function PaymentTypesPage() {
  const userId = await requireProjectManager();
  const types = await getPaymentTypes(userId);

  return (
    <>
      <PaymentTypesHeading />
      <PaymentTypesEditor types={types} />
    </>
  );
}
