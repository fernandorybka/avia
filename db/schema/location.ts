import {
  index,
  integer,
  pgTable,
  serial,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./base";

export const countries = pgTable(
  "countries",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 10 }),

    ...timestamps,
  },
  (table) => ({
    nameIdx: uniqueIndex("countries_name_idx").on(table.name),
    codeIdx: uniqueIndex("countries_code_idx").on(table.code),
  })
);

export const states = pgTable(
  "states",
  {
    id: serial("id").primaryKey(),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 10 }),

    ...timestamps,
  },
  (table) => ({
    countryIdx: index("states_country_idx").on(table.countryId),
    nameIdx: index("states_name_idx").on(table.name),
    codeIdx: index("states_code_idx").on(table.code),
  })
);

export const cities = pgTable(
  "cities",
  {
    id: serial("id").primaryKey(),
    stateId: integer("state_id").references(() => states.id, {
      onDelete: "set null",
    }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 120 }).notNull(),

    ...timestamps,
  },
  (table) => ({
    stateIdx: index("cities_state_idx").on(table.stateId),
    countryIdx: index("cities_country_idx").on(table.countryId),
    nameIdx: index("cities_name_idx").on(table.name),
  })
);