import { PageHeader } from "@/components/commons/page-header";
import { CreateShowForm } from "@/components/shows/create-show-form";

export default async function NovoEspetaculoPage() {
  return (
    <div>
      <PageHeader
        title="Novo Espetáculo"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Espetáculos", href: "/admin/espetaculos" },
          { label: "Novo" },
        ]}
      />
      <CreateShowForm />
    </div>
  );
}
