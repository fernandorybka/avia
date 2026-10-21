import { pgTable, text, timestamp, uuid, varchar, unique, boolean, integer, numeric } from "drizzle-orm/pg-core";

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  content: text("content"), // Extracted raw text for rendering/preview
  storageUrl: text("storage_url"), // R2 pointer (r2:key) or legacy Base64
  tags: text("tags").array().notNull().default([]), // List of tags for filtering
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templatePlaceholders = pgTable("template_placeholders", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => templates.id, { onDelete: "cascade" }).notNull(),
  placeholder: text("placeholder").notNull(), // ##NOME##
  fieldKey: text("field_key").notNull(), // NOME
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentGenerations = pgTable("document_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(), // Mocked user_id
  name: text("name").notNull(), // Name for the profile/pre-fill
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documentGenerationValues = pgTable("document_generation_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id").references(() => documentGenerations.id, { onDelete: "cascade" }).notNull(),
  fieldKey: text("field_key").notNull(),
  fieldValue: text("field_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.generationId, t.fieldKey)
]);

export const preparedTemplateCategories = pgTable("prepared_template_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  path: text("path").notNull().unique(),
  pathKey: text("path_key").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const preparedTemplates = pgTable("prepared_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: uuid("category_id").references(() => preparedTemplateCategories.id, { onDelete: "set null" }),
  storageUrl: text("storage_url").notNull(),
  isPublic: boolean("is_public").notNull().default(true),
  ownerUserId: varchar("owner_user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const merchProducts = pgTable("merch_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#a8a29e"), // Swatch shown on the sales screen
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const merchVariants = pgTable("merch_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => merchProducts.id, { onDelete: "cascade" }).notNull(),
  size: text("size").notNull(),
  quantity: integer("quantity").notNull().default(0), // Units available right now
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Sales keep a text snapshot so products can be renamed or deleted without touching history
export const merchSales = pgTable("merch_sales", {
  id: uuid("id").primaryKey().defaultRandom(),
  variantId: uuid("variant_id").references(() => merchVariants.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  size: text("size").notNull(),
  price: numeric("price", { precision: 10, scale: 2, mode: "number" }).notNull(),
  soldBy: text("sold_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// People allowed to use the merch screens without being admins (admins come from ADMIN_EMAILS)
export const merchMembers = pgTable("merch_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(), // Stored lowercase
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
