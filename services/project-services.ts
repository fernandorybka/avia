import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  budgetItems,
  budgetVersions,
  paymentChecklistStates,
  paymentTypeChecklistItems,
  paymentTypes,
  payments,
  projects,
} from "@/db/schema";
import { decryptFieldValue } from "@/lib/field-encryption";
import { canAccessProject } from "@/lib/project-access";
import { ProjectAccessError, requireProjectManager } from "@/lib/project-guard";
import {
  checklistStatus,
  DEFAULT_PAYMENT_TYPES,
  formatBudgetItemLabel,
  summarizeBudget,
  type BudgetItemStatus,
  type BudgetItemSummary,
  type ChecklistItem,
  type ChecklistState,
} from "@/lib/projects";
import type { ColumnMapping } from "@/lib/budget-mapping";

/*
 * Reads for the projects module. Callers must have passed requireOwnedProject /
 * requireProjectManager first; every function here still scopes by project or owner.
 * Values are decrypted here, on the server, and only for that scope.
 */

export type ProjectListItem = { id: string; name: string; hasBudget: boolean; createdAt: string };

export type PaymentTypeView = {
  id: string;
  name: string;
  budgetItemOptional: boolean;
  archived: boolean;
  items: ChecklistItem[];
};

export type BudgetItemView = {
  id: string;
  code: string | null;
  name: string;
  label: string;
  status: BudgetItemStatus;
  paymentCount: number;
} & BudgetItemSummary;

export type PaymentView = {
  id: string;
  budgetItemId: string | null;
  paymentTypeId: string;
  paymentDate: string;
  amountCents: number;
  payee: string;
  comment: string;
  createdAt: string;
  checklist: Record<string, ChecklistState>;
  docsComplete: boolean;
  docsPending: number;
};

export type ProjectTotals = {
  plannedCents: number;
  paidCents: number;
  balanceCents: number;
  pendingDocsCount: number;
  overspentCount: number;
};

export type ProjectData = {
  items: BudgetItemView[];
  payments: PaymentView[];
  types: PaymentTypeView[];
  totals: ProjectTotals;
};

export function decryptCents(value: string): number {
  const cents = Number.parseInt(decryptFieldValue(value), 10);
  if (!Number.isSafeInteger(cents)) throw new Error("Invalid stored amount");
  return cents;
}

export function decryptOptional(value: string | null): string | null {
  return value === null ? null : decryptFieldValue(value);
}

export async function getOwnedProjects(ownerUserId: string): Promise<ProjectListItem[]> {
  const rows = await db
    .select({ id: projects.id, name: projects.name, currentVersionId: projects.currentVersionId, createdAt: projects.createdAt })
    .from(projects)
    .where(eq(projects.ownerUserId, ownerUserId))
    .orderBy(desc(projects.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    hasBudget: row.currentVersionId !== null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * First visit creates the default types. Ids are generated here so types and items go
 * in one batch (a transaction); a concurrent first visit hits the unique (owner, name)
 * constraint and rolls back, which is fine — the other one won.
 */
async function seedDefaultPaymentTypes(ownerUserId: string): Promise<void> {
  const typeRows = DEFAULT_PAYMENT_TYPES.map((type, position) => ({
    id: randomUUID(),
    ownerUserId,
    name: type.name,
    budgetItemOptional: type.budgetItemOptional,
    position,
  }));
  const itemRows = DEFAULT_PAYMENT_TYPES.flatMap((type, typeIndex) =>
    type.items.map((item, position) => ({
      paymentTypeId: typeRows[typeIndex].id,
      label: item.label,
      allowNotApplicable: item.allowNotApplicable,
      position,
    }))
  );

  try {
    await db.batch([db.insert(paymentTypes).values(typeRows), db.insert(paymentTypeChecklistItems).values(itemRows)]);
  } catch {
    // Lost the race with another request seeding the same defaults
  }
}

function paymentTypesQuery(ownerUserId: string) {
  return db
    .select({ type: paymentTypes, item: paymentTypeChecklistItems })
    .from(paymentTypes)
    .leftJoin(paymentTypeChecklistItems, eq(paymentTypeChecklistItems.paymentTypeId, paymentTypes.id))
    .where(eq(paymentTypes.ownerUserId, ownerUserId))
    .orderBy(asc(paymentTypes.position), asc(paymentTypes.createdAt), asc(paymentTypeChecklistItems.position));
}

type PaymentTypeRow = Awaited<ReturnType<typeof paymentTypesQuery>>[number];

function groupPaymentTypes(rows: PaymentTypeRow[]): PaymentTypeView[] {
  const types = new Map<string, PaymentTypeView>();
  for (const { type, item } of rows) {
    let view = types.get(type.id);
    if (!view) {
      view = { id: type.id, name: type.name, budgetItemOptional: type.budgetItemOptional, archived: type.archivedAt !== null, items: [] };
      types.set(type.id, view);
    }
    if (item) {
      view.items.push({ id: item.id, label: item.label, allowNotApplicable: item.allowNotApplicable, archived: item.archivedAt !== null });
    }
  }
  return [...types.values()];
}

/** Types and their checklist items in a single round trip (each Neon query costs ~100 ms). */
async function loadPaymentTypes(ownerUserId: string): Promise<PaymentTypeView[]> {
  return groupPaymentTypes(await paymentTypesQuery(ownerUserId));
}

export async function getPaymentTypes(ownerUserId: string): Promise<PaymentTypeView[]> {
  const types = await loadPaymentTypes(ownerUserId);
  if (types.length > 0) return types;

  await seedDefaultPaymentTypes(ownerUserId);
  return loadPaymentTypes(ownerUserId);
}

/**
 * The project tabs' single read: ownership check and all their data in ONE Neon round trip
 * (db.batch sends every query in one HTTP request). Replaces requireOwnedProject + a second
 * round of queries, which made each tab switch wait for two trips to the database.
 * Every data query is also scoped to "this id AND owned by this user" in SQL, so nothing
 * from someone else's project is read even before the ownership check below runs.
 */
export const getOwnedProjectDataForRender = cache(
  async (projectId: string): Promise<{ userId: string; projectId: string; data: ProjectData }> => {
    const userId = await requireProjectManager();
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
      throw new ProjectAccessError();
    }

    const ownedProject = and(eq(projects.id, projectId), eq(projects.ownerUserId, userId));
    const ownedProjectIds = db.select({ id: projects.id }).from(projects).where(ownedProject);

    const [projectRows, itemRows, paymentRows, typeRows, stateRows] = await db.batch([
      db.select({ ownerUserId: projects.ownerUserId }).from(projects).where(ownedProject).limit(1),
      db
        .select()
        .from(budgetItems)
        .where(and(inArray(budgetItems.projectId, ownedProjectIds), ne(budgetItems.status, "removed")))
        .orderBy(asc(budgetItems.position)),
      db.select().from(payments).where(inArray(payments.projectId, ownedProjectIds)),
      paymentTypesQuery(userId),
      db
        .select({
          paymentId: paymentChecklistStates.paymentId,
          checklistItemId: paymentChecklistStates.checklistItemId,
          state: paymentChecklistStates.state,
        })
        .from(paymentChecklistStates)
        .innerJoin(payments, eq(payments.id, paymentChecklistStates.paymentId))
        .where(inArray(payments.projectId, ownedProjectIds)),
    ]);

    const [project] = projectRows;
    if (!project || !canAccessProject({ userId, isManager: true, projectOwnerUserId: project.ownerUserId })) {
      throw new ProjectAccessError();
    }

    // First visit ever: no types yet (rare, costs the extra trips only once per user)
    let types = groupPaymentTypes(typeRows);
    if (types.length === 0) {
      types = await getPaymentTypes(userId);
    }

    return { userId, projectId, data: buildProjectData(itemRows, paymentRows, types, stateRows) };
  }
);

function buildProjectData(
  itemRows: (typeof budgetItems.$inferSelect)[],
  paymentRows: (typeof payments.$inferSelect)[],
  types: PaymentTypeView[],
  stateRows: { paymentId: string; checklistItemId: string; state: ChecklistState }[]
): ProjectData {
  const typeById = new Map(types.map((type) => [type.id, type]));
  const statesByPayment = new Map<string, Record<string, ChecklistState>>();
  for (const row of stateRows) {
    statesByPayment.set(row.paymentId, { ...statesByPayment.get(row.paymentId), [row.checklistItemId]: row.state });
  }

  const paymentViews: PaymentView[] = paymentRows.map((row) => {
    const checklist = statesByPayment.get(row.id) ?? {};
    const status = checklistStatus(typeById.get(row.paymentTypeId)?.items ?? [], checklist);
    return {
      id: row.id,
      budgetItemId: row.budgetItemId,
      paymentTypeId: row.paymentTypeId,
      paymentDate: row.paymentDate,
      amountCents: decryptCents(row.amountCents),
      payee: decryptFieldValue(row.payee),
      comment: decryptOptional(row.comment) ?? "",
      createdAt: row.createdAt.toISOString(),
      checklist,
      docsComplete: status.complete,
      docsPending: status.pending,
    };
  });

  const itemViews: BudgetItemView[] = itemRows.map((row) => {
    const code = decryptOptional(row.code);
    const name = decryptFieldValue(row.name);
    const itemPayments = paymentViews.filter((payment) => payment.budgetItemId === row.id);
    return {
      id: row.id,
      code,
      name,
      label: formatBudgetItemLabel(code, name),
      status: row.status,
      paymentCount: itemPayments.length,
      ...summarizeBudget(decryptCents(row.plannedCents), itemPayments.map((payment) => payment.amountCents)),
    };
  });

  const plannedCents = itemViews.reduce((sum, item) => sum + item.plannedCents, 0);
  const paidCents = paymentViews.reduce((sum, payment) => sum + payment.amountCents, 0);

  return {
    items: itemViews,
    payments: paymentViews,
    types,
    totals: {
      plannedCents,
      paidCents,
      balanceCents: plannedCents - paidCents,
      pendingDocsCount: paymentViews.filter((payment) => !payment.docsComplete).length,
      overspentCount: itemViews.filter((item) => item.overspent).length,
    },
  };
}

export type BudgetVersionView = {
  id: string;
  versionNumber: number;
  originalFilename: string;
  appliedAt: string;
};

export type BudgetPageData = {
  versions: BudgetVersionView[];
  lastMapping: { sheetName: string | null; mapping: ColumnMapping | null } | null;
};

export async function getBudgetPageData(projectId: string): Promise<BudgetPageData> {
  const rows = await db
    .select()
    .from(budgetVersions)
    .where(and(eq(budgetVersions.projectId, projectId), eq(budgetVersions.status, "applied")))
    .orderBy(desc(budgetVersions.versionNumber));

  const latest = rows[0];
  return {
    versions: rows.map((row) => ({
      id: row.id,
      versionNumber: row.versionNumber,
      originalFilename: decryptFieldValue(row.originalFilename),
      appliedAt: (row.appliedAt ?? row.createdAt).toISOString(),
    })),
    lastMapping: latest
      ? { sheetName: decryptOptional(latest.sheetName), mapping: latest.columnMapping ?? null }
      : null,
  };
}
