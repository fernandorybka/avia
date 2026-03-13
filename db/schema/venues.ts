import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { cities, countries, states } from "./location";
import { timestamps } from "./base";

export const venueTypeEnum = pgEnum("venue_type", [
  "theater",
  "street",
  "square",
  "cultural_center",
  "school",
  "independent_space",
  "gallery",
  "other",
]);

export const venues = pgTable(
  "venues",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    venueType: venueTypeEnum("venue_type").default("theater"),
    address: text("address"),
    neighborhood: varchar("neighborhood", { length: 120 }),
    postalCode: varchar("postal_code", { length: 20 }),

    cityId: integer("city_id").references(() => cities.id, {
      onDelete: "set null",
    }),
    stateId: integer("state_id").references(() => states.id, {
      onDelete: "set null",
    }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),

    latitude: varchar("latitude", { length: 30 }),
    longitude: varchar("longitude", { length: 30 }),

    email: varchar("email", { length: 180 }),
    phone: varchar("phone", { length: 40 }),
    websiteUrl: text("website_url"),
    instagramUrl: text("instagram_url"),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("venues_slug_idx").on(table.slug),
    nameIdx: index("venues_name_idx").on(table.name),
    cityIdx: index("venues_city_idx").on(table.cityId),
    activeIdx: index("venues_active_idx").on(table.isActive),
  })
);