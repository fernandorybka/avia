import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { cities, countries, states } from "./location";
import { timestamps } from "./base";

export const personStatusEnum = pgEnum("person_status", [
  "active",
  "inactive",
  "draft",
]);

export const theaterGroupMemberRoleEnum = pgEnum("theater_group_member_role", [
  "member",
  "actor",
  "actress",
  "director",
  "producer",
  "technician",
  "playwright",
  "musician",
  "other",
]);

export const people = pgTable(
  "people",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    socialName: varchar("social_name", { length: 160 }),
    bio: text("bio"),
    photoUrl: text("photo_url"),

    email: varchar("email", { length: 180 }),
    phone: varchar("phone", { length: 40 }),
    websiteUrl: text("website_url"),
    instagramUrl: text("instagram_url"),
    facebookUrl: text("facebook_url"),
    youtubeUrl: text("youtube_url"),

    cityId: integer("city_id").references(() => cities.id, {
      onDelete: "set null",
    }),
    stateId: integer("state_id").references(() => states.id, {
      onDelete: "set null",
    }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),

    status: personStatusEnum("status").notNull().default("active"),

    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("people_slug_idx").on(table.slug),
    nameIdx: index("people_name_idx").on(table.name),
    cityIdx: index("people_city_idx").on(table.cityId),
    statusIdx: index("people_status_idx").on(table.status),
  })
);

export const theaterGroups = pgTable(
  "theater_groups",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    shortDescription: varchar("short_description", { length: 255 }),
    fullDescription: text("full_description"),

    foundationYear: integer("foundation_year"),

    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),

    email: varchar("email", { length: 180 }),
    phone: varchar("phone", { length: 40 }),
    websiteUrl: text("website_url"),
    instagramUrl: text("instagram_url"),
    facebookUrl: text("facebook_url"),
    youtubeUrl: text("youtube_url"),

    cityId: integer("city_id").references(() => cities.id, {
      onDelete: "set null",
    }),
    stateId: integer("state_id").references(() => states.id, {
      onDelete: "set null",
    }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),

    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("theater_groups_slug_idx").on(table.slug),
    nameIdx: index("theater_groups_name_idx").on(table.name),
    cityIdx: index("theater_groups_city_idx").on(table.cityId),
    activeIdx: index("theater_groups_active_idx").on(table.isActive),
  })
);

export const theaterGroupMembers = pgTable(
  "theater_group_members",
  {
    id: serial("id").primaryKey(),

    theaterGroupId: integer("theater_group_id")
      .notNull()
      .references(() => theaterGroups.id, { onDelete: "cascade" }),

    personId: integer("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),

    role: theaterGroupMemberRoleEnum("role").default("member"),
    roleName: varchar("role_name", { length: 120 }),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),

    isFounder: boolean("is_founder").notNull().default(false),
    isCurrentMember: boolean("is_current_member").notNull().default(true),

    ...timestamps,
  },
  (table) => ({
    groupIdx: index("theater_group_members_group_idx").on(table.theaterGroupId),
    personIdx: index("theater_group_members_person_idx").on(table.personId),
    uniqueMembershipIdx: uniqueIndex("theater_group_members_unique_idx").on(
      table.theaterGroupId,
      table.personId,
      table.roleName
    ),
  })
);