import { db } from "@/db";
import { countries } from "@/db/schema";
import { PageHeader } from "@/components/commons/page-header";
import { CreateCountryForm } from "@/components/location/create-country-form";

export default async function NovoPaisPage() {
  return (
    <div>
      <PageHeader
        title="Novo País"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Países", href: "/admin/localizacao/paises" },
          { label: "Novo" },
        ]}
      />
      <CreateCountryForm />
    </div>
  );
}
