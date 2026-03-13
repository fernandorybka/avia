import { PageHeader } from "@/components/commons/page-header";
import { CreateCreditRoleForm } from "@/components/shows/create-credit-role-form";

export default function NovaFuncaoCreditoPage() {
  return (
    <div>
      <PageHeader
        title="Nova Função de Crédito"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Funções de Crédito", href: "/admin/funcoes-de-credito" },
          { label: "Nova" },
        ]}
      />
      <CreateCreditRoleForm />
    </div>
  );
}
