import { db } from "@/db";
import { countries } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/commons/page-header";
import { CreateStateForm } from "@/components/location/create-state-form";

export default async function NovoEstadoPage() {
  const allCountries = await db
    .select({ id: countries.id, name: countries.name })
    .from(countries)
    .orderBy(asc(countries.name));

  return (
    <div>
      <PageHeader
        title="Novo Estado"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Estados", href: "/admin/localizacao/estados" },
          { label: "Novo" },
        ]}
      />
      <CreateStateForm countries={allCountries} />
    </div>
  );
}
