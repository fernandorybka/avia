import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./base";

export const linkEntityTypeEnum = pgEnum("link_entity_type", [
  "show",
  "theater_group",
  "person",
  "venue",
]);

export const linkTypeEnum = pgEnum("link_type", [
  "review",
  "article",
  "interview",
  "ticket",
  "official_site",
  "instagram",
  "facebook",
  "youtube",
  "press",
  "program",
  "other",
]);

export const externalLinks = pgTable(
  "external_links",
  {
    id: serial("id").primaryKey(),

    entityType: linkEntityTypeEnum("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),

    linkType: linkTypeEnum("link_type").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    url: text("url").notNull(),
    sourceName: varchar("source_name", { length: 140 }),
    description: text("description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    isOfficial: boolean("is_official").notNull().default(false),
    sortOrder: integer("sort_order").default(0),

    ...timestamps,
  },
  (table) => ({
    entityIdx: index("external_links_entity_idx").on(
      table.entityType,
      table.entityId
    ),
    linkTypeIdx: index("external_links_link_type_idx").on(table.linkType),
    officialIdx: index("external_links_official_idx").on(table.isOfficial),
  })
);