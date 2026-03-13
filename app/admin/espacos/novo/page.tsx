import { db } from "@/db";
import { countries, states, cities } from "@/db/schema";
import { asc } from "drizzle-orm";
import { PageHeader } from "@/components/commons/page-header";
import { CreateVenueForm } from "@/components/venues/create-venue-form";

export default async function NovoEspacoPage() {
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
        title="Novo Espaço"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Espaços", href: "/admin/espacos" },
          { label: "Novo" },
        ]}
      />
      <CreateVenueForm
        countries={allCountries}
        states={allStates}
        cities={allCities}
      />
    </div>
  );
}
