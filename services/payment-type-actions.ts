"use server";

import { and, eq, inArray, isNull, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { paymentChecklistStates, paymentTypeChecklistItems, paymentTypes, payments } from "@/db/schema";
import { requireProjectManager } from "@/lib/project-guard";
import {
  isUniqueViolation,
  ProjectError,
  requireId,
  requireText,
  runProjectAction,
  type ActionResult,
} from "@/services/project-action-runner";

/*
 * Payment types and checklists belong to one person; every query is scoped by ownerUserId.
 * Edits put the ownership check inside the write itself (one round trip instead of two).
 */

/** Ids of the person's types, as a subquery for checklist item writes. */
function ownedTypeIds(ownerUserId: string) {
  return db.select({ id: paymentTypes.id }).from(paymentTypes).where(eq(paymentTypes.ownerUserId, ownerUserId));
}

function ownedChecklistItem(itemId: string, ownerUserId: string) {
  return and(
    eq(paymentTypeChecklistItems.id, requireId(itemId)),
    inArray(paymentTypeChecklistItems.paymentTypeId, ownedTypeIds(ownerUserId))
  );
}

function ownedType(typeId: string, ownerUserId: string) {
  return and(eq(paymentTypes.id, requireId(typeId)), eq(paymentTypes.ownerUserId, ownerUserId));
}

function requireFound(rows: unknown[], message: string) {
  if (rows.length === 0) throw new ProjectError(message);
}

async function withUniqueName<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (isUniqueViolation(error)) throw new ProjectError("Já existe um tipo com esse nome.");
    throw error;
  }
}

function requireIdList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new ProjectError("Ordem inválida.");
  const ids = value.map(requireId);
  if (new Set(ids).size !== ids.length) throw new ProjectError("Ordem inválida.");
  return ids;
}

export async function createPaymentTypeAction(rawName: string): Promise<ActionResult> {
  return runProjectAction("createPaymentType", async () => {
    const userId = await requireProjectManager();
    const name = requireText(rawName, "Nome do tipo", 80);
    const [{ last }] = await db
      .select({ last: max(paymentTypes.position) })
      .from(paymentTypes)
      .where(eq(paymentTypes.ownerUserId, userId));

    await withUniqueName(() =>
      db.insert(paymentTypes).values({ ownerUserId: userId, name, position: (last ?? -1) + 1 })
    );
    return null;
  });
}

export async function updatePaymentTypeAction(
  typeId: string,
  changes: { name?: string; budgetItemOptional?: boolean }
): Promise<ActionResult> {
  return runProjectAction("updatePaymentType", async () => {
    const userId = await requireProjectManager();

    if (changes.budgetItemOptional === false) {
      const [withoutItem] = await db
        .select({ id: payments.id })
        .from(payments)
        .innerJoin(paymentTypes, eq(paymentTypes.id, payments.paymentTypeId))
        .where(and(ownedType(typeId, userId), isNull(payments.budgetItemId)))
        .limit(1);
      if (withoutItem) {
        throw new ProjectError("Há pagamentos deste tipo sem rubrica. Escolha uma rubrica para eles antes.");
      }
    }

    const updated = await withUniqueName(() =>
      db
        .update(paymentTypes)
        .set({
          ...(changes.name !== undefined && { name: requireText(changes.name, "Nome do tipo", 80) }),
          ...(changes.budgetItemOptional !== undefined && { budgetItemOptional: Boolean(changes.budgetItemOptional) }),
        })
        .where(ownedType(typeId, userId))
        .returning({ id: paymentTypes.id })
    );
    requireFound(updated, "Tipo não encontrado.");
    return null;
  });
}

/** Deletes an unused type; one that already has payments is archived instead so they keep showing it. */
export async function removePaymentTypeAction(typeId: string): Promise<ActionResult<{ archived: boolean }>> {
  return runProjectAction("removePaymentType", async () => {
    const userId = await requireProjectManager();

    const [used] = await db.select({ id: payments.id }).from(payments).where(eq(payments.paymentTypeId, requireId(typeId))).limit(1);
    if (used) {
      const archived = await db
        .update(paymentTypes)
        .set({ archivedAt: new Date() })
        .where(ownedType(typeId, userId))
        .returning({ id: paymentTypes.id });
      requireFound(archived, "Tipo não encontrado.");
      return { archived: true };
    }

    const deleted = await db.delete(paymentTypes).where(ownedType(typeId, userId)).returning({ id: paymentTypes.id });
    requireFound(deleted, "Tipo não encontrado.");
    return { archived: false };
  });
}

export async function restorePaymentTypeAction(typeId: string): Promise<ActionResult> {
  return runProjectAction("restorePaymentType", async () => {
    const userId = await requireProjectManager();
    const restored = await db
      .update(paymentTypes)
      .set({ archivedAt: null })
      .where(ownedType(typeId, userId))
      .returning({ id: paymentTypes.id });
    requireFound(restored, "Tipo não encontrado.");
    return null;
  });
}

/** Saves the order of the person's active types (first = top). */
export async function reorderPaymentTypesAction(orderedIds: string[]): Promise<ActionResult> {
  return runProjectAction("reorderPaymentTypes", async () => {
    const userId = await requireProjectManager();
    const statements: BatchItem<"pg">[] = requireIdList(orderedIds).map((id, position) =>
      db.update(paymentTypes).set({ position }).where(ownedType(id, userId))
    );
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    return null;
  });
}

/* ---------- Checklist items ---------- */

export async function addChecklistItemAction(typeId: string, rawLabel: string): Promise<ActionResult> {
  return runProjectAction("addChecklistItem", async () => {
    const userId = await requireProjectManager();
    const label = requireText(rawLabel, "Documento", 150);

    // Ownership check and next position in one query
    const [type] = await db
      .select({ id: paymentTypes.id, last: max(paymentTypeChecklistItems.position) })
      .from(paymentTypes)
      .leftJoin(paymentTypeChecklistItems, eq(paymentTypeChecklistItems.paymentTypeId, paymentTypes.id))
      .where(ownedType(typeId, userId))
      .groupBy(paymentTypes.id);
    if (!type) throw new ProjectError("Tipo não encontrado.");

    await db.insert(paymentTypeChecklistItems).values({ paymentTypeId: type.id, label, position: (type.last ?? -1) + 1 });
    return null;
  });
}

export async function updateChecklistItemAction(
  itemId: string,
  changes: { label?: string; allowNotApplicable?: boolean }
): Promise<ActionResult> {
  return runProjectAction("updateChecklistItem", async () => {
    const userId = await requireProjectManager();
    const updated = await db
      .update(paymentTypeChecklistItems)
      .set({
        ...(changes.label !== undefined && { label: requireText(changes.label, "Documento", 150) }),
        ...(changes.allowNotApplicable !== undefined && { allowNotApplicable: Boolean(changes.allowNotApplicable) }),
      })
      .where(ownedChecklistItem(itemId, userId))
      .returning({ id: paymentTypeChecklistItems.id });
    requireFound(updated, "Item não encontrado.");
    return null;
  });
}

/** Deletes an unused item; one already marked on some payment is archived so those marks survive. */
export async function removeChecklistItemAction(itemId: string): Promise<ActionResult<{ archived: boolean }>> {
  return runProjectAction("removeChecklistItem", async () => {
    const userId = await requireProjectManager();

    const [used] = await db
      .select({ id: paymentChecklistStates.id })
      .from(paymentChecklistStates)
      .where(eq(paymentChecklistStates.checklistItemId, requireId(itemId)))
      .limit(1);
    if (used) {
      const archived = await db
        .update(paymentTypeChecklistItems)
        .set({ archivedAt: new Date() })
        .where(ownedChecklistItem(itemId, userId))
        .returning({ id: paymentTypeChecklistItems.id });
      requireFound(archived, "Item não encontrado.");
      return { archived: true };
    }

    const deleted = await db
      .delete(paymentTypeChecklistItems)
      .where(ownedChecklistItem(itemId, userId))
      .returning({ id: paymentTypeChecklistItems.id });
    requireFound(deleted, "Item não encontrado.");
    return { archived: false };
  });
}

export async function restoreChecklistItemAction(itemId: string): Promise<ActionResult> {
  return runProjectAction("restoreChecklistItem", async () => {
    const userId = await requireProjectManager();
    const restored = await db
      .update(paymentTypeChecklistItems)
      .set({ archivedAt: null })
      .where(ownedChecklistItem(itemId, userId))
      .returning({ id: paymentTypeChecklistItems.id });
    requireFound(restored, "Item não encontrado.");
    return null;
  });
}

/** Saves the order of a type's active checklist items (first = top). */
export async function reorderChecklistItemsAction(typeId: string, orderedIds: string[]): Promise<ActionResult> {
  return runProjectAction("reorderChecklistItems", async () => {
    const userId = await requireProjectManager();
    const type = requireId(typeId);
    const statements: BatchItem<"pg">[] = requireIdList(orderedIds).map((id, position) =>
      db
        .update(paymentTypeChecklistItems)
        .set({ position })
        .where(and(ownedChecklistItem(id, userId), eq(paymentTypeChecklistItems.paymentTypeId, type)))
    );
    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    return null;
  });
}
