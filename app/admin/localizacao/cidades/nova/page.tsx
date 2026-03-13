import { db } from "@/db";
import { countries, states } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/commons/page-header";
import { CreateCityForm } from "@/components/location/create-city-form";

export default async function NovaCidadePage() {
  const [allCountries, allStates] = await Promise.all([
    db.select({ id: countries.id, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
    db.select({ id: states.id, name: states.name, countryId: states.countryId })
      .from(states)
      .orderBy(asc(states.name)),
  ]);

  return (
    <div>
      <PageHeader
        title="Nova Cidade"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Cidades", href: "/admin/localizacao/cidades" },
          { label: "Nova" },
        ]}
      />
      <CreateCityForm countries={allCountries} states={allStates} />
    </div>
  );
}
