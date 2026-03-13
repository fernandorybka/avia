import {
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./base";

export const tagEntityTypeEnum = pgEnum("tag_entity_type", [
  "show",
  "theater_group",
  "person",
  "venue",
]);

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),

    entityType: tagEntityTypeEnum("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),

    tag: varchar("tag", { length: 120 }).notNull(),
    description: text("description"),

    ...timestamps,
  },
  (table) => ({
    entityIdx: index("tags_entity_idx").on(table.entityType, table.entityId),
    tagIdx: index("tags_tag_idx").on(table.tag),
  })
);