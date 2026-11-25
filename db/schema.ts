import { pgTable, text, timestamp, uuid, varchar, unique, boolean, integer, numeric, index, date, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  content: text("content"), // Extracted raw text for rendering/preview
  storageUrl: text("storage_url"), // R2 pointer (r2:key) or legacy Base64
  tags: text("tags").array().notNull().default([]), // List of tags for filtering
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("templates_user_id_idx").on(t.userId),
]);

// One color per tag name, per user, so the tag looks the same everywhere it shows up
export const tagColors = pgTable("tag_colors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  tag: text("tag").notNull(),
  color: varchar("color", { length: 7 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique().on(t.userId, t.tag)
]);

export const templatePlaceholders = pgTable("template_placeholders", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id").references(() => templates.id, { onDelete: "cascade" }).notNull(),
  placeholder: text("placeholder").notNull(), // ##NOME##
  fieldKey: text("field_key").notNull(), // NOME
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("template_placeholders_template_id_idx").on(t.templateId),
]);

export const documentGenerations = pgTable("document_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(), // Mocked user_id
  name: text("name").notNull(), // Name for the profile/pre-fill
  groupName: text("group_name"), // Parent level (e.g. a show or a venue); null = no level
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("document_generations_user_id_idx").on(t.userId),
]);

// Custom display order of cadastro levels; levels without a row sort alphabetically after these
export const cadastroGroupOrder = pgTable("cadastro_group_order", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  groupName: text("group_name").notNull(),
  position: integer("position").notNull(),
}, (t) => [
  unique().on(t.userId, t.groupName)
]);

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

/* ---------- Monitor de pagamentos de projetos culturais ----------
 * Access: PROJECT_MANAGER_EMAILS (env) + project owner. Columns marked "encrypted"
 * hold enc:v1: values from lib/field-encryption.ts — amounts are integer cents as text.
 */

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: varchar("owner_user_id", { length: 255 }).notNull(),
  name: text("name").notNull(), // Public name of the cultural project, not sensitive
  currentVersionId: uuid("current_version_id").references((): AnyPgColumn => budgetVersions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("projects_owner_user_id_idx").on(t.ownerUserId),
]);

// One row per uploaded spreadsheet; "draft" until the column mapping is confirmed
export const budgetVersions = pgTable("budget_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  versionNumber: integer("version_number").notNull(),
  storageKey: text("storage_key").notNull(), // r2:budgets/<owner>/<project>/<uuid>.enc (file itself is encrypted)
  originalFilename: text("original_filename").notNull(), // encrypted
  sheetName: text("sheet_name"), // encrypted, set when applied
  columnMapping: jsonb("column_mapping").$type<{ code: number | null; name: number; amount: number }>(),
  status: varchar("status", { length: 16 }).$type<"draft" | "applied">().notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
}, (t) => [
  unique().on(t.projectId, t.versionNumber),
]);

// Stable identity of a rubrica (payments point here) with its current values
export const budgetItems = pgTable("budget_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  code: text("code"), // encrypted
  name: text("name").notNull(), // encrypted
  plannedCents: text("planned_cents").notNull(), // encrypted
  position: integer("position").notNull(),
  status: varchar("status", { length: 16 }).$type<"active" | "out_of_budget" | "removed">().notNull().default("active"),
  createdInVersionId: uuid("created_in_version_id").references(() => budgetVersions.id, { onDelete: "set null" }),
  updatedInVersionId: uuid("updated_in_version_id").references(() => budgetVersions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("budget_items_project_id_idx").on(t.projectId),
]);

// Snapshot of each applied version, so change history can be built later without a migration
export const budgetVersionLines = pgTable("budget_version_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").references(() => budgetVersions.id, { onDelete: "cascade" }).notNull(),
  budgetItemId: uuid("budget_item_id").references(() => budgetItems.id, { onDelete: "cascade" }).notNull(),
  code: text("code"), // encrypted
  name: text("name").notNull(), // encrypted
  plannedCents: text("planned_cents").notNull(), // encrypted
  position: integer("position").notNull(),
}, (t) => [
  index("budget_version_lines_version_id_idx").on(t.versionId),
]);

// Payment types and their document checklists, managed per person
export const paymentTypes = pgTable("payment_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: varchar("owner_user_id", { length: 255 }).notNull(),
  name: text("name").notNull(),
  budgetItemOptional: boolean("budget_item_optional").notNull().default(false), // e.g. Devolução
  position: integer("position").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.ownerUserId, t.name),
]);

export const paymentTypeChecklistItems = pgTable("payment_type_checklist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentTypeId: uuid("payment_type_id").references(() => paymentTypes.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  allowNotApplicable: boolean("allow_not_applicable").notNull().default(true),
  position: integer("position").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }), // Kept so marks on old payments survive
}, (t) => [
  index("payment_type_checklist_items_type_id_idx").on(t.paymentTypeId),
]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  budgetItemId: uuid("budget_item_id").references(() => budgetItems.id, { onDelete: "no action" }), // null only if the type allows it; "no action" so deleting a project cascades cleanly
  paymentTypeId: uuid("payment_type_id").references(() => paymentTypes.id, { onDelete: "no action" }).notNull(),
  paymentDate: date("payment_date", { mode: "string" }).notNull(),
  amountCents: text("amount_cents").notNull(), // encrypted
  payee: text("payee").notNull(), // encrypted
  comment: text("comment"), // encrypted
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("payments_project_date_idx").on(t.projectId, t.paymentDate),
]);

// Missing row = pending
export const paymentChecklistStates = pgTable("payment_checklist_states", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  checklistItemId: uuid("checklist_item_id").references(() => paymentTypeChecklistItems.id, { onDelete: "cascade" }).notNull(),
  state: varchar("state", { length: 8 }).$type<"done" | "na">().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique().on(t.paymentId, t.checklistItemId),
]);
