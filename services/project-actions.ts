"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, max, ne, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import {
  budgetItems,
  budgetVersionLines,
  budgetVersions,
  paymentChecklistStates,
  paymentTypeChecklistItems,
  paymentTypes,
  payments,
  projects,
} from "@/db/schema";
import { decryptBuffer, decryptFieldValue, encryptBuffer, encryptFieldValue } from "@/lib/field-encryption";
import { deleteTemplateFromR2, getR2KeyFromPointer, getTemplateBufferFromR2, makeR2Pointer, uploadBudgetFileToR2 } from "@/lib/r2";
import { readBudgetWorkbook, MAX_BUDGET_FILE_BYTES } from "@/lib/budget-sheet";
import { applyMapping, isValidMapping, selectIncludedItems, type ColumnMapping, type SheetData } from "@/lib/budget-mapping";
import { linksByRowToIndexes, matchBudgetItems, type CurrentBudgetItem } from "@/lib/budget-diff";
import { paymentInputSchema, type PaymentInput } from "@/lib/projects";
import { requireOwnedProject, requireProjectManager } from "@/lib/project-guard";
import { decryptCents, decryptOptional } from "@/services/project-services";
import {
  ProjectError,
  requireId,
  requireText,
  runProjectAction,
  type ActionResult,
} from "@/services/project-action-runner";

function encryptCents(cents: number): string {
  return encryptFieldValue(String(cents));
}

async function deleteR2Quietly(storageKeys: string[]) {
  await Promise.all(
    storageKeys.map(async (storageKey) => {
      try {
        await deleteTemplateFromR2(getR2KeyFromPointer(storageKey));
      } catch {
        console.error("[projects] could not delete a budget file from R2");
      }
    })
  );
}

/* ---------- Projects ---------- */

export async function createProjectAction(rawName: string): Promise<ActionResult<{ id: string }>> {
  return runProjectAction("createProject", async () => {
    const userId = await requireProjectManager();
    const [project] = await db
      .insert(projects)
      .values({ ownerUserId: userId, name: requireText(rawName, "Nome do projeto", 150) })
      .returning({ id: projects.id });
    return { id: project.id };
  });
}

export async function renameProjectAction(projectId: string, rawName: string): Promise<ActionResult> {
  return runProjectAction("renameProject", async () => {
    const { project } = await requireOwnedProject(projectId);
    await db
      .update(projects)
      .set({ name: requireText(rawName, "Nome do projeto", 150) })
      .where(eq(projects.id, project.id));
    return null;
  });
}

/** Deletes the project, its budget, payments and every spreadsheet stored in R2. */
export async function deleteProjectAction(projectId: string): Promise<ActionResult> {
  return runProjectAction("deleteProject", async () => {
    const { project } = await requireOwnedProject(projectId);
    const versions = await db
      .select({ storageKey: budgetVersions.storageKey })
      .from(budgetVersions)
      .where(eq(budgetVersions.projectId, project.id));

    await db.delete(projects).where(eq(projects.id, project.id));
    await deleteR2Quietly(versions.map((version) => version.storageKey));
    return null;
  });
}

/* ---------- Budget spreadsheet ---------- */

export type UploadedBudget = { versionId: string; sheets: SheetData[] };

/**
 * Validates and parses the file, stores it encrypted in R2 and returns the sheets for
 * the mapping step. Older unconfirmed uploads of the same project are discarded.
 */
export async function uploadBudgetFileAction(projectId: string, formData: FormData): Promise<ActionResult<UploadedBudget>> {
  return runProjectAction("uploadBudgetFile", async () => {
    const { userId, project } = await requireOwnedProject(projectId);

    const file = formData.get("file");
    if (!(file instanceof File)) throw new ProjectError("Escolha uma planilha.");
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new ProjectError("Envie a planilha em .xlsx. Se for .xls ou .ods, salve como .xlsx.");
    }
    if (file.size > MAX_BUDGET_FILE_BYTES) throw new ProjectError("A planilha pode ter no máximo 2 MB.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const sheets = await readBudgetWorkbook(buffer);

    const drafts = await db
      .select({ id: budgetVersions.id, storageKey: budgetVersions.storageKey })
      .from(budgetVersions)
      .where(and(eq(budgetVersions.projectId, project.id), eq(budgetVersions.status, "draft")));
    if (drafts.length > 0) {
      await db.delete(budgetVersions).where(inArray(budgetVersions.id, drafts.map((draft) => draft.id)));
      await deleteR2Quietly(drafts.map((draft) => draft.storageKey));
    }

    const [{ latest }] = await db
      .select({ latest: max(budgetVersions.versionNumber) })
      .from(budgetVersions)
      .where(eq(budgetVersions.projectId, project.id));

    const key = await uploadBudgetFileToR2({ ownerUserId: userId, projectId: project.id, encryptedBuffer: encryptBuffer(buffer) });
    try {
      const [version] = await db
        .insert(budgetVersions)
        .values({
          projectId: project.id,
          versionNumber: (latest ?? 0) + 1,
          storageKey: makeR2Pointer(key),
          originalFilename: encryptFieldValue(file.name.slice(0, 200)),
        })
        .returning({ id: budgetVersions.id });
      return { versionId: version.id, sheets };
    } catch (error) {
      await deleteR2Quietly([makeR2Pointer(key)]);
      throw error;
    }
  });
}

/** Current items with what's been paid, decrypted, for matching against a new version. */
async function loadCurrentItems(projectId: string): Promise<CurrentBudgetItem[]> {
  const [itemRows, paymentRows] = await Promise.all([
    db.select().from(budgetItems).where(eq(budgetItems.projectId, projectId)),
    db
      .select({ budgetItemId: payments.budgetItemId, amountCents: payments.amountCents })
      .from(payments)
      .where(eq(payments.projectId, projectId)),
  ]);

  return itemRows.map((row) => {
    const itemPayments = paymentRows.filter((payment) => payment.budgetItemId === row.id);
    return {
      id: row.id,
      code: decryptOptional(row.code),
      name: decryptFieldValue(row.name),
      plannedCents: decryptCents(row.plannedCents),
      paidCents: itemPayments.reduce((sum, payment) => sum + decryptCents(payment.amountCents), 0),
      paymentCount: itemPayments.length,
      status: row.status,
    };
  });
}

/**
 * Applies a confirmed mapping. The file is read again from R2 and mapped here — rows
 * computed in the browser are only a preview and are never trusted. All writes go in
 * one batch (a single transaction on Neon HTTP).
 */
export async function applyBudgetVersionAction(
  projectId: string,
  versionId: string,
  choice: {
    sheetIndex: number;
    mapping: ColumnMapping;
    /** spreadsheet rows unticked in the preview */
    excludedRows: number[];
    /** spreadsheet row → existing budget item id */
    linksByRow: Record<number, string>;
  }
): Promise<ActionResult<{ itemCount: number }>> {
  return runProjectAction("applyBudgetVersion", async () => {
    const { project } = await requireOwnedProject(projectId);
    const [version] = await db
      .select()
      .from(budgetVersions)
      .where(and(eq(budgetVersions.id, requireId(versionId)), eq(budgetVersions.projectId, project.id)))
      .limit(1);
    if (!version) throw new ProjectError("Planilha não encontrada. Envie de novo.");
    if (version.status !== "draft") throw new ProjectError("Essa planilha já foi aplicada.");

    const encrypted = await getTemplateBufferFromR2(getR2KeyFromPointer(version.storageKey));
    const sheets = await readBudgetWorkbook(decryptBuffer(encrypted));
    const sheet = Number.isInteger(choice.sheetIndex) ? sheets[choice.sheetIndex] : undefined;
    if (!sheet) throw new ProjectError("Aba não encontrada.");

    const mapping: ColumnMapping = {
      code: choice.mapping.code === null ? null : Number(choice.mapping.code),
      name: Number(choice.mapping.name),
      amount: Number(choice.mapping.amount),
    };
    if (!isValidMapping(mapping, sheet.header.length)) throw new ProjectError("Escolha colunas diferentes para cada campo.");

    // Rows that couldn't be read are simply left out, like the ones the person unticked
    const excludedRows = Array.isArray(choice.excludedRows) ? choice.excludedRows.filter(Number.isInteger) : [];
    const items = selectIncludedItems(applyMapping(sheet.rows, mapping).items, excludedRows);
    if (items.length === 0) throw new ProjectError("Selecione ao menos uma rubrica.");

    const linksByRow: Record<number, string> = {};
    for (const [row, id] of Object.entries(choice.linksByRow ?? {})) {
      if (typeof id === "string") linksByRow[Number(row)] = id;
    }
    const manualLinks = linksByRowToIndexes(items, linksByRow);

    const current = await loadCurrentItems(project.id);
    const diff = matchBudgetItems(current, items, { matchByCode: mapping.code !== null, manualLinks });
    const matchedByIndex = new Map(diff.matched.map((match) => [match.incomingIndex, match.current.id]));

    const statements: BatchItem<"pg">[] = [];
    const itemIds = items.map((_, index) => matchedByIndex.get(index) ?? randomUUID());

    items.forEach((item, index) => {
      const values = {
        code: item.code === null ? null : encryptFieldValue(item.code),
        name: encryptFieldValue(item.name),
        plannedCents: encryptCents(item.plannedCents),
        position: index,
        status: "active" as const,
        updatedInVersionId: version.id,
      };
      statements.push(
        matchedByIndex.has(index)
          ? db.update(budgetItems).set(values).where(and(eq(budgetItems.id, itemIds[index]), eq(budgetItems.projectId, project.id)))
          : db.insert(budgetItems).values({ ...values, id: itemIds[index], projectId: project.id, createdInVersionId: version.id })
      );
    });

    if (diff.removedEmpty.length > 0) {
      statements.push(
        db
          .update(budgetItems)
          .set({ status: "removed", updatedInVersionId: version.id })
          .where(and(inArray(budgetItems.id, diff.removedEmpty.map((item) => item.id)), eq(budgetItems.projectId, project.id)))
      );
    }
    // Items that leave the budget but have payments keep their payments, with nothing planned
    diff.removedWithPayments.forEach((item, index) => {
      statements.push(
        db
          .update(budgetItems)
          .set({ status: "out_of_budget", plannedCents: encryptCents(0), position: items.length + index, updatedInVersionId: version.id })
          .where(and(eq(budgetItems.id, item.id), eq(budgetItems.projectId, project.id)))
      );
    });

    statements.push(
      db.insert(budgetVersionLines).values(
        items.map((item, index) => ({
          versionId: version.id,
          budgetItemId: itemIds[index],
          code: item.code === null ? null : encryptFieldValue(item.code),
          name: encryptFieldValue(item.name),
          plannedCents: encryptCents(item.plannedCents),
          position: index,
        }))
      ),
      db
        .update(budgetVersions)
        .set({ status: "applied", sheetName: encryptFieldValue(sheet.name), columnMapping: mapping, appliedAt: new Date() })
        .where(and(eq(budgetVersions.id, version.id), eq(budgetVersions.status, "draft"))),
      db.update(projects).set({ currentVersionId: version.id }).where(eq(projects.id, project.id))
    );

    await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);
    return { itemCount: items.length };
  });
}

/* ---------- Payments ---------- */

async function validatePayment(
  projectId: string,
  ownerUserId: string,
  rawInput: PaymentInput,
  existing?: { id: string; paymentTypeId: string }
): Promise<PaymentInput> {
  const parsed = paymentInputSchema.safeParse(rawInput);
  if (!parsed.success) throw new ProjectError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const input = parsed.data;

  const [type] = await db
    .select()
    .from(paymentTypes)
    .where(and(eq(paymentTypes.id, input.paymentTypeId), eq(paymentTypes.ownerUserId, ownerUserId)))
    .limit(1);
  if (!type) throw new ProjectError("Escolha o tipo.");
  if (type.archivedAt && existing?.paymentTypeId !== type.id) throw new ProjectError("Esse tipo foi arquivado.");

  if (input.budgetItemId === null) {
    if (!type.budgetItemOptional) throw new ProjectError("Escolha a rubrica.");
    return input;
  }

  const [item] = await db
    .select({ id: budgetItems.id, plannedCents: budgetItems.plannedCents })
    .from(budgetItems)
    .where(and(eq(budgetItems.id, input.budgetItemId), eq(budgetItems.projectId, projectId), ne(budgetItems.status, "removed")))
    .limit(1);
  if (!item) throw new ProjectError("Rubrica não encontrada.");

  const others = await db
    .select({ id: payments.id, amountCents: payments.amountCents })
    .from(payments)
    .where(and(eq(payments.projectId, projectId), eq(payments.budgetItemId, item.id)));
  const paidCents = others
    .filter((payment) => payment.id !== existing?.id)
    .reduce((sum, payment) => sum + decryptCents(payment.amountCents), 0);

  if (paidCents + input.amountCents > decryptCents(item.plannedCents) && !input.confirmOverBudget) {
    throw new ProjectError("Esse pagamento ultrapassa o saldo da rubrica. Marque a confirmação para salvar.");
  }
  return input;
}

function encryptPayment(input: PaymentInput) {
  return {
    paymentTypeId: input.paymentTypeId,
    budgetItemId: input.budgetItemId,
    paymentDate: input.paymentDate,
    amountCents: encryptCents(input.amountCents),
    payee: encryptFieldValue(input.payee),
    comment: input.comment ? encryptFieldValue(input.comment) : null,
  };
}

export async function createPaymentAction(projectId: string, rawInput: PaymentInput): Promise<ActionResult<{ id: string }>> {
  return runProjectAction("createPayment", async () => {
    const { userId, project } = await requireOwnedProject(projectId);
    const input = await validatePayment(project.id, userId, rawInput);
    const [payment] = await db
      .insert(payments)
      .values({ ...encryptPayment(input), projectId: project.id })
      .returning({ id: payments.id });
    return { id: payment.id };
  });
}

export async function updatePaymentAction(projectId: string, paymentId: string, rawInput: PaymentInput): Promise<ActionResult> {
  return runProjectAction("updatePayment", async () => {
    const { userId, project } = await requireOwnedProject(projectId);
    const [existing] = await db
      .select({ id: payments.id, paymentTypeId: payments.paymentTypeId })
      .from(payments)
      .where(and(eq(payments.id, requireId(paymentId)), eq(payments.projectId, project.id)))
      .limit(1);
    if (!existing) throw new ProjectError("Pagamento não encontrado.");

    const input = await validatePayment(project.id, userId, rawInput, existing);
    const update = db
      .update(payments)
      .set({ ...encryptPayment(input), updatedAt: new Date() })
      .where(and(eq(payments.id, existing.id), eq(payments.projectId, project.id)));

    if (input.paymentTypeId === existing.paymentTypeId) {
      await update;
      return null;
    }

    // New type, new checklist: drop marks that belonged to the old type's items
    const newTypeItems = db
      .select({ id: paymentTypeChecklistItems.id })
      .from(paymentTypeChecklistItems)
      .where(eq(paymentTypeChecklistItems.paymentTypeId, input.paymentTypeId));
    await db.batch([
      update,
      db
        .delete(paymentChecklistStates)
        .where(and(eq(paymentChecklistStates.paymentId, existing.id), notInArray(paymentChecklistStates.checklistItemId, newTypeItems))),
    ]);
    return null;
  });
}

export async function deletePaymentAction(projectId: string, paymentId: string): Promise<ActionResult> {
  return runProjectAction("deletePayment", async () => {
    const { project } = await requireOwnedProject(projectId);
    const deleted = await db
      .delete(payments)
      .where(and(eq(payments.id, requireId(paymentId)), eq(payments.projectId, project.id)))
      .returning({ id: payments.id });
    if (deleted.length === 0) throw new ProjectError("Esse pagamento já foi excluído.");
    return null;
  });
}

export async function setChecklistStateAction(
  projectId: string,
  paymentId: string,
  checklistItemId: string,
  state: "pending" | "done" | "na"
): Promise<ActionResult> {
  return runProjectAction("setChecklistState", async () => {
    const userId = await requireProjectManager();
    if (!["pending", "done", "na"].includes(state)) throw new ProjectError("Estado inválido.");

    // Tapped often, so ownership (project → payment → item of the payment's type) is one query
    const [target] = await db
      .select({ paymentId: payments.id, itemId: paymentTypeChecklistItems.id, allowNotApplicable: paymentTypeChecklistItems.allowNotApplicable })
      .from(payments)
      .innerJoin(projects, and(eq(projects.id, payments.projectId), eq(projects.ownerUserId, userId)))
      .innerJoin(
        paymentTypeChecklistItems,
        and(eq(paymentTypeChecklistItems.id, requireId(checklistItemId)), eq(paymentTypeChecklistItems.paymentTypeId, payments.paymentTypeId))
      )
      .where(and(eq(payments.id, requireId(paymentId)), eq(payments.projectId, requireId(projectId))))
      .limit(1);
    if (!target) throw new ProjectError("Pagamento não encontrado.");
    if (state === "na" && !target.allowNotApplicable) throw new ProjectError("Esse documento é obrigatório.");

    if (state === "pending") {
      await db
        .delete(paymentChecklistStates)
        .where(and(eq(paymentChecklistStates.paymentId, target.paymentId), eq(paymentChecklistStates.checklistItemId, target.itemId)));
    } else {
      await db
        .insert(paymentChecklistStates)
        .values({ paymentId: target.paymentId, checklistItemId: target.itemId, state })
        .onConflictDoUpdate({
          target: [paymentChecklistStates.paymentId, paymentChecklistStates.checklistItemId],
          set: { state, updatedAt: new Date() },
        });
    }
    return null;
  });
}
