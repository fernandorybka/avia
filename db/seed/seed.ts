import "dotenv/config";
import { db } from '@/db'

import {
  countries,
  states,
  cities,
} from "../schema/location";

import {
  people,
  theaterGroups,
  theaterGroupMembers,
} from "../schema/people";

import {
  venues,
} from "../schema/venues";

import {
  shows,
  showCredits,
  creditRoles,
  showSessions,
  showTheaterGroups,
} from "../schema/shows";

import {
  tags,
} from "../schema/tags";

async function seed() {

  console.log("🌱 Seeding database...");

  /*
  ---------------------------
  LOCATION
  ---------------------------
  */

  const [brazil] = await db
    .insert(countries)
    .values({
      name: "Brasil",
      code: "BR",
    })
    .returning();

  const [pernambuco] = await db
    .insert(states)
    .values({
      name: "Pernambuco",
      code: "PE",
      countryId: brazil.id,
    })
    .returning();

  const [recife] = await db
    .insert(cities)
    .values({
      name: "Recife",
      stateId: pernambuco.id,
      countryId: brazil.id,
    })
    .returning();

  /*
  ---------------------------
  CREDIT ROLES
  ---------------------------
  */

  const roles = await db.insert(creditRoles).values([
    { name: "Direção", slug: "direcao", department: "artistic" },
    { name: "Dramaturgia", slug: "dramaturgia", department: "artistic" },
    { name: "Elenco", slug: "elenco", department: "artistic" },
    { name: "Iluminação", slug: "iluminacao", department: "technical" },
    { name: "Sonoplastia", slug: "sonoplastia", department: "technical" },
    { name: "Figurino", slug: "figurino", department: "technical" },
    { name: "Cenografia", slug: "cenografia", department: "technical" },
    { name: "Produção", slug: "producao", department: "production" },
  ]).returning();

  const roleDirecao = roles.find(r => r.slug === "direcao")!;
  const roleElenco = roles.find(r => r.slug === "elenco")!;

  /*
  ---------------------------
  PEOPLE
  ---------------------------
  */

  const [fernando] = await db.insert(people).values({
    name: "Fernando Rybka",
    slug: "fernando-rybka",
    bio: "Artista, pesquisador e desenvolvedor.",
    cityId: recife.id,
    stateId: pernambuco.id,
    countryId: brazil.id,
  }).returning();

  const [amanda] = await db.insert(people).values({
    name: "Amanda Pegado",
    slug: "amanda-pegado",
    bio: "Atriz e pesquisadora em teatro.",
    cityId: recife.id,
  }).returning();

  const [andre] = await db.insert(people).values({
    name: "André Alencar",
    slug: "andre-alencar",
    bio: "Ator e pesquisador.",
    cityId: recife.id,
  }).returning();

  /*
  ---------------------------
  GROUP
  ---------------------------
  */

  const [micanga] = await db.insert(theaterGroups).values({
    name: "Teatro Miçanga",
    slug: "teatro-micanga",
    shortDescription: "Grupo de teatro de Recife.",
    foundationYear: 2016,
    cityId: recife.id,
  }).returning();

  await db.insert(theaterGroupMembers).values([
    {
      theaterGroupId: micanga.id,
      personId: fernando.id,
      roleName: "integrante",
      isFounder: true,
    },
    {
      theaterGroupId: micanga.id,
      personId: amanda.id,
      roleName: "integrante",
      isFounder: true,
    },
    {
      theaterGroupId: micanga.id,
      personId: andre.id,
      roleName: "integrante",
      isFounder: true,
    },
  ]);

  /*
  ---------------------------
  VENUE
  ---------------------------
  */

  const [beta] = await db.insert(venues).values({
    name: "Peixe Beta Espaço Cultural",
    slug: "peixe-beta",
    venueType: "cultural_center",
    cityId: recife.id,
  }).returning();

  /*
  ---------------------------
  SHOW
  ---------------------------
  */

  const [show] = await db.insert(shows).values({
    title: "Quando um Lugar Teima em Não Desaparecer",
    slug: "quando-um-lugar-teima-em-nao-desaparecer",
    synopsis:
      "Espetáculo de rua que investiga memórias urbanas e cartografias afetivas.",
    status: "published",
  }).returning();

  /*
  ---------------------------
  SHOW GROUP
  ---------------------------
  */

  await db.insert(showTheaterGroups).values({
    showId: show.id,
    theaterGroupId: micanga.id,
    relationshipType: "primary",
    isPrimary: true,
  });

  /*
  ---------------------------
  SHOW CREDITS
  ---------------------------
  */

  await db.insert(showCredits).values([
    {
      showId: show.id,
      personId: fernando.id,
      creditRoleId: roleDirecao.id,
    },
    {
      showId: show.id,
      personId: amanda.id,
      creditRoleId: roleElenco.id,
    },
    {
      showId: show.id,
      personId: andre.id,
      creditRoleId: roleElenco.id,
    },
  ]);

  /*
  ---------------------------
  SESSION
  ---------------------------
  */

  await db.insert(showSessions).values({
    showId: show.id,
    venueId: beta.id,
    startAt: new Date("2025-03-15T19:00:00Z"),
    sessionType: "premiere",
    status: "scheduled",
  });

  /*
  ---------------------------
  TAGS
  ---------------------------
  */

  await db.insert(tags).values([
    {
      entityType: "show",
      entityId: show.id,
      tag: "teatro de rua",
    },
    {
      entityType: "show",
      entityId: show.id,
      tag: "itinerante",
    },
    {
      entityType: "theater_group",
      entityId: micanga.id,
      tag: "recife",
    },
    {
      entityType: "person",
      entityId: fernando.id,
      tag: "dramaturgo",
    },
  ]);

  console.log("✅ Seed finished");
}

seed();