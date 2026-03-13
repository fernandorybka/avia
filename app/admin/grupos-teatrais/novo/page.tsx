import { db } from "@/db";
import { countries, states, cities } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/commons/page-header";
import { CreateTheaterGroupForm } from "@/components/theater-groups/create-theater-group-form";

export default async function NovoGrupoTeatralPage() {
  const [allCountries, allStates, allCities] = await Promise.all([
    db.select({ id: countries.id, name: countries.name })
      .from(countries)
      .orderBy(asc(countries.name)),
    db.select({ id: states.id, name: states.name, countryId: states.countryId })
      .from(states)
      .orderBy(asc(states.name)),
    db.select({ id: cities.id, name: cities.name, stateId: cities.stateId })
      .from(cities)
      .orderBy(asc(cities.name)),
  ]);

  return (
    <div>
      <PageHeader
        title="Novo Grupo Teatral"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Grupos Teatrais", href: "/admin/grupos-teatrais" },
          { label: "Novo" },
        ]}
      />
      <CreateTheaterGroupForm
        countries={allCountries}
        states={allStates}
        cities={allCities}
      />
    </div>
  );
}
