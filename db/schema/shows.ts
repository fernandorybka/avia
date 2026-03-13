import {
  boolean,
  date,
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
import { timestamps } from "./base";
import { people, theaterGroups } from "./people";
import { cities, countries, states } from "./location";
import { venues } from "./venues";

export const showStatusEnum = pgEnum("show_status", [
  "draft",
  "published",
  "archived",
]);

export const showGroupRelationshipEnum = pgEnum("show_group_relationship", [
  "primary",
  "coproduction",
  "partner",
  "invited",
]);

export const creditDepartmentEnum = pgEnum("credit_department", [
  "artistic",
  "technical",
  "production",
  "accessibility",
  "music",
  "communication",
  "other",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "cancelled",
  "completed",
]);

export const sessionTypeEnum = pgEnum("session_type", [
  "regular",
  "premiere",
  "festival",
  "invited",
  "special",
  "other",
]);

export const shows = pgTable(
  "shows",
  {
    id: serial("id").primaryKey(),

    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    subtitle: varchar("subtitle", { length: 220 }),
    shortDescription: varchar("short_description", { length: 255 }),
    synopsis: text("synopsis"),
    fullDescription: text("full_description"),

    durationMinutes: integer("duration_minutes"),
    premiereDate: date("premiere_date"),
    ageRating: varchar("age_rating", { length: 40 }),
    language: varchar("language", { length: 80 }),

    coverImageUrl: text("cover_image_url"),
    status: showStatusEnum("status").notNull().default("draft"),

    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("shows_slug_idx").on(table.slug),
    titleIdx: index("shows_title_idx").on(table.title),
    statusIdx: index("shows_status_idx").on(table.status),
  })
);

export const showTheaterGroups = pgTable(
  "show_theater_groups",
  {
    id: serial("id").primaryKey(),

    showId: integer("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),

    theaterGroupId: integer("theater_group_id")
      .notNull()
      .references(() => theaterGroups.id, { onDelete: "cascade" }),

    relationshipType: showGroupRelationshipEnum("relationship_type").default(
      "primary"
    ),
    isPrimary: boolean("is_primary").notNull().default(false),

    ...timestamps,
  },
  (table) => ({
    showIdx: index("show_theater_groups_show_idx").on(table.showId),
    groupIdx: index("show_theater_groups_group_idx").on(table.theaterGroupId),
    uniqueLinkIdx: uniqueIndex("show_theater_groups_unique_idx").on(
      table.showId,
      table.theaterGroupId
    ),
  })
);

export const creditRoles = pgTable(
  "credit_roles",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    department: creditDepartmentEnum("department").default("other"),
    sortOrder: integer("sort_order").default(0),

    ...timestamps,
  },
  (table) => ({
    slugIdx: uniqueIndex("credit_roles_slug_idx").on(table.slug),
    nameIdx: uniqueIndex("credit_roles_name_idx").on(table.name),
    departmentIdx: index("credit_roles_department_idx").on(table.department),
  })
);

export const showCredits = pgTable(
  "show_credits",
  {
    id: serial("id").primaryKey(),

    showId: integer("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),

    personId: integer("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),

    creditRoleId: integer("credit_role_id")
      .notNull()
      .references(() => creditRoles.id, { onDelete: "restrict" }),

    customRoleName: varchar("custom_role_name", { length: 120 }),
    creditGroupName: varchar("credit_group_name", { length: 120 }),
    sortOrder: integer("sort_order").default(0),
    notes: text("notes"),

    ...timestamps,
  },
  (table) => ({
    showIdx: index("show_credits_show_idx").on(table.showId),
    personIdx: index("show_credits_person_idx").on(table.personId),
    roleIdx: index("show_credits_role_idx").on(table.creditRoleId),
    uniqueCreditIdx: uniqueIndex("show_credits_unique_idx").on(
      table.showId,
      table.personId,
      table.creditRoleId
    ),
  })
);

export const showSessions = pgTable(
  "show_sessions",
  {
    id: serial("id").primaryKey(),

    showId: integer("show_id")
      .notNull()
      .references(() => shows.id, { onDelete: "cascade" }),

    venueId: integer("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),

    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),

    sessionType: sessionTypeEnum("session_type").default("regular"),
    roomName: varchar("room_name", { length: 120 }),

    cityId: integer("city_id").references(() => cities.id, {
      onDelete: "set null",
    }),
    stateId: integer("state_id").references(() => states.id, {
      onDelete: "set null",
    }),
    countryId: integer("country_id").references(() => countries.id, {
      onDelete: "set null",
    }),

    status: sessionStatusEnum("status").notNull().default("scheduled"),
    ticketUrl: text("ticket_url"),
    notes: text("notes"),
    creditNotes: text("credit_notes"),

    ...timestamps,
  },
  (table) => ({
    showIdx: index("show_sessions_show_idx").on(table.showId),
    venueIdx: index("show_sessions_venue_idx").on(table.venueId),
    startAtIdx: index("show_sessions_start_at_idx").on(table.startAt),
    statusIdx: index("show_sessions_status_idx").on(table.status),
    cityIdx: index("show_sessions_city_idx").on(table.cityId),
  })
);