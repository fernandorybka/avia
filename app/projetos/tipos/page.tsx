import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";
import { PaymentTypesEditor } from "@/components/projects/PaymentTypesEditor";
import { requireProjectManager } from "@/lib/project-guard";
import { getPaymentTypes } from "@/services/project-services";

export default async function PaymentTypesPage() {
  const userId = await requireProjectManager();
  const types = await getPaymentTypes(userId);

  return (
    <>
      <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Projetos
      </Link>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tipos de pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Cada tipo define a documentação que o pagamento precisa ter. Vale para todos os seus projetos.
          </p>
        </div>
      </div>
      <PaymentTypesEditor types={types} />
    </>
  );
}
