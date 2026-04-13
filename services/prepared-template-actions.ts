"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { preparedTemplateCategories, preparedTemplates } from "@/db/schema";
import { isCurrentUserAdmin } from "@/lib/admin";
import { sanitizeText } from "@/lib/sanitize";
import { buildCategoryPathKey, normalizeCategoryPath } from "@/lib/prepared-template-categories";
import {
  deleteTemplateFromR2,
  getR2KeyFromPointer,
  makeR2Pointer,
  uploadPreparedTemplateToR2,
} from "@/lib/r2";
import {
  applyDocxSlotWildcards,
  extractDocxSlotSummary,
  normalizeDocxContent,
  parseDocxPlaceholders,
  validateDocxTemplateFormatting,
} from "@/lib/docx-utils";
import { eq, inArray, or } from "drizzle-orm";
import { getTemplateSuggestionProvider } from "@/lib/ai/template-suggester";
import { resolveCanonicalWildcardKey } from "@/lib/wildcard-catalog";

type SlotSuggestionPreview = {
  slot: number;
  fieldKey: string;
  confidence: number;
  reason?: string;
  context: string;
};

type BatchSuggestionItem = {
  index: number;
  originalFilename: string;
  suggestedName: string;
  suggestions: SlotSuggestionPreview[];
  error?: string;
};

const KEEP_BLANK_SLOT_TOKEN = "__KEEP_BLANK__";

function validateDocxFile(file: File) {
  if (!file || !(file.name || "").toLowerCase().endsWith(".docx")) {
    throw new Error("Formato não suportado. Envie apenas arquivos .docx.");
  }
}

function extractSlotContexts(textWithSlots: string, slotCount: number): Record<number, string> {
  const contexts: Record<number, string> = {};
  const normalized = textWithSlots.replace(/\s+/g, " ").trim();

  for (let i = 1; i <= slotCount; i += 1) {
    const marker = `[SLOT_${i}]`;
    const idx = normalized.indexOf(marker);
    if (idx < 0) {
      contexts[i] = "";
      continue;
    }
    const left = Math.max(0, idx - 60);
    const right = Math.min(normalized.length, idx + marker.length + 60);
    contexts[i] = normalized.slice(left, right).trim();
  }

  return contexts;
}

function parseSlotFieldKeysJson(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Mapeamento de slots inválido (JSON malformado).");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Mapeamento de slots inválido (esperado: array).");
  }

  return parsed.map((item, index) => {
    const key = String(item ?? "").trim();
    if (key === KEEP_BLANK_SLOT_TOKEN) {
      return "";
    }
    if (!key) return `CAMPO_${index + 1}`;
    return resolveCanonicalWildcardKey(key);
  });
}

async function maybePrepareTemplateWithAi(buffer: Buffer, mode: string, predefinedSlotKeys?: string[]): Promise<Buffer> {
  if (mode !== "ai") {
    return buffer;
  }

  const { textWithSlots, slotCount } = extractDocxSlotSummary(buffer);

  if (slotCount === 0) {
    throw new Error(
      "Não encontrei lacunas com sublinhado (_____) no documento original para converter em coringas automaticamente."
    );
  }

  let slotKeys = predefinedSlotKeys;

  if (!slotKeys || slotKeys.length === 0) {
    const provider = getTemplateSuggestionProvider();
    const result = await provider.suggestSlotKeys({ textWithSlots, slotCount });
    slotKeys = result.slots.map((item) => item.fieldKey);
  }

  return applyDocxSlotWildcards(buffer, slotKeys);
}

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "modelo-pronto"}-${suffix}`;
}

function parseBatchPayload(raw: string): Array<{ index: number; name: string; slotFieldKeys: string[] }> {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Payload de publicação em lote inválido (JSON malformado).");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Payload de publicação em lote inválido (esperado: array).");
  }

  return parsed.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Payload de publicação em lote inválido.");
    }

    const obj = item as Record<string, unknown>;
    const index = Number(obj.index);
    const name = sanitizeText(String(obj.name ?? ""), 255);
    const slotFieldKeysRaw = JSON.stringify(obj.slotFieldKeys ?? []);
    const slotFieldKeys = parseSlotFieldKeysJson(slotFieldKeysRaw);

    if (!Number.isInteger(index) || index < 0) {
      throw new Error("Payload de publicação em lote contém índice inválido.");
    }

    return {
      index,
      name,
      slotFieldKeys,
    };
  });
}

export async function suggestPreparedTemplateSlotsAction(formData: FormData): Promise<{
  suggestedName: string;
  suggestions: SlotSuggestionPreview[];
}> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("file") as File;
  validateDocxFile(file);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer) as Buffer;
  const { textWithSlots, slotCount } = extractDocxSlotSummary(buffer);

  if (slotCount === 0) {
    throw new Error("Não encontrei lacunas com sublinhado (_____) para sugerir coringas.");
  }

  const provider = getTemplateSuggestionProvider();
  const result = await provider.suggestSlotKeys({ textWithSlots, slotCount });
  const contexts = extractSlotContexts(textWithSlots, slotCount);

  return {
    suggestedName: result.suggestedTemplateName,
    suggestions: result.slots.map((item) => ({
      slot: item.slot,
      fieldKey: item.fieldKey,
      confidence: item.confidence,
      reason: item.reason,
      context: contexts[item.slot] ?? "",
    })),
  };
}

export async function suggestPreparedTemplateBatchAction(formData: FormData): Promise<{ items: BatchSuggestionItem[] }> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    throw new Error("Envie ao menos um arquivo .docx.");
  }

  const provider = getTemplateSuggestionProvider();

  const items = await Promise.all(
    files.map(async (file, index) => {
      try {
        validateDocxFile(file);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer) as Buffer;
        const { textWithSlots, slotCount } = extractDocxSlotSummary(buffer);

        if (slotCount === 0) {
          return {
            index,
            originalFilename: file.name,
            suggestedName: "",
            suggestions: [],
            error: "Não encontrei lacunas com sublinhado (_____) neste arquivo.",
          } satisfies BatchSuggestionItem;
        }

        const result = await provider.suggestSlotKeys({ textWithSlots, slotCount });
        const contexts = extractSlotContexts(textWithSlots, slotCount);

        return {
          index,
          originalFilename: file.name,
          suggestedName: result.suggestedTemplateName,
          suggestions: result.slots.map((item) => ({
            slot: item.slot,
            fieldKey: item.fieldKey,
            confidence: item.confidence,
            reason: item.reason,
            context: contexts[item.slot] ?? "",
          })),
        } satisfies BatchSuggestionItem;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro ao analisar arquivo.";
        return {
          index,
          originalFilename: file.name,
          suggestedName: "",
          suggestions: [],
          error: message,
        } satisfies BatchSuggestionItem;
      }
    })
  );

  return { items };
}

async function resolvePreparedTemplateCategoryId(categoryPath: string, categoryPathKey: string): Promise<string> {
  const [existingCategory] = await db
    .select({ id: preparedTemplateCategories.id, path: preparedTemplateCategories.path })
    .from(preparedTemplateCategories)
    .where(
      or(
        eq(preparedTemplateCategories.pathKey, categoryPathKey),
        eq(preparedTemplateCategories.path, categoryPath)
      )
    )
    .limit(1);

  if (existingCategory) {
    if (existingCategory.path !== categoryPath) {
      await db
        .update(preparedTemplateCategories)
        .set({ path: categoryPath })
        .where(eq(preparedTemplateCategories.id, existingCategory.id));
    }
    return existingCategory.id;
  }

  try {
    const [insertedCategory] = await db
      .insert(preparedTemplateCategories)
      .values({
        path: categoryPath,
        pathKey: categoryPathKey,
      })
      .returning({ id: preparedTemplateCategories.id });

    return insertedCategory.id;
  } catch {
    const [categoryAfterConflict] = await db
      .select({ id: preparedTemplateCategories.id })
      .from(preparedTemplateCategories)
      .where(
        or(
          eq(preparedTemplateCategories.pathKey, categoryPathKey),
          eq(preparedTemplateCategories.path, categoryPath)
        )
      )
      .limit(1);

    if (!categoryAfterConflict) {
      throw new Error("Não foi possível resolver a categoria do modelo pronto.");
    }

    return categoryAfterConflict.id;
  }
}

export async function createPreparedTemplateAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("file") as File;
  const rawName = (formData.get("name") as string) ?? "";
  const rawCategoryPath = (formData.get("categoryPath") as string) ?? "";
  const preparationMode = ((formData.get("preparationMode") as string) ?? "manual").toLowerCase();
  const rawSlotFieldKeysJson = (formData.get("slotFieldKeysJson") as string) ?? "";

  if (!file || !rawName) {
    throw new Error("Arquivo e nome são obrigatórios.");
  }

  validateDocxFile(file);

  const name = sanitizeText(rawName, 255);
  if (!name) {
    throw new Error("Nome do modelo inválido.");
  }

  const categoryPath = normalizeCategoryPath(rawCategoryPath);
  if (!categoryPath) {
    throw new Error("Categoria inválida. Informe ao menos um nível.");
  }

  const categoryPathKey = buildCategoryPathKey(categoryPath);
  const slug = buildSlug(name);

  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer) as Buffer;
  const slotFieldKeys = parseSlotFieldKeysJson(rawSlotFieldKeysJson);

  buffer = await maybePrepareTemplateWithAi(buffer, preparationMode, slotFieldKeys);
  buffer = await normalizeDocxContent(buffer);
  await parseDocxPlaceholders(buffer);
  const formattingCheck = await validateDocxTemplateFormatting(buffer);

  if (!formattingCheck.isValid) {
    const unresolved = formattingCheck.unresolvedPlaceholders.slice(0, 3).join(", ");
    const invalid = formattingCheck.invalidPlaceholders.slice(0, 3).join(", ");
    const details = [
      formattingCheck.hasDanglingDelimiters
        ? "há delimitadores de coringa abertos/fechados de forma incorreta"
        : null,
      unresolved
        ? `há campos que não podem ser substituídos automaticamente (${unresolved})`
        : null,
      invalid
        ? `há coringas com formato inválido (${invalid})`
        : null,
    ]
      .filter(Boolean)
      .join("; ");

    throw new Error(
      `Erro de formatação no modelo: ${details}. Ajuste os coringas no Word e tente novamente.`
    );
  }

  let r2Key: string | null = null;
  try {
    r2Key = await uploadPreparedTemplateToR2({
      slug,
      originalFilename: file.name,
      buffer,
      contentType: file.type || undefined,
      ownerUserId: null,
    });
  } catch (error) {
    console.error("Erro ao enviar modelo pronto para o R2:", error);
    throw new Error("Não foi possível enviar o arquivo para o R2.");
  }

  try {
    const categoryId = await resolvePreparedTemplateCategoryId(categoryPath, categoryPathKey);

    await db.insert(preparedTemplates).values({
      slug,
      name,
      categoryId,
      storageUrl: makeR2Pointer(r2Key),
      isPublic: true,
      ownerUserId: null,
    });
  } catch (error) {
    if (r2Key) {
      try {
        await deleteTemplateFromR2(r2Key);
      } catch (cleanupError) {
        console.error("Erro ao limpar arquivo do R2 após falha:", cleanupError);
      }
    }
    throw error;
  }

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  redirect("/admin/modelos-prontos?status=uploaded");
}

export async function publishPreparedTemplateBatchAction(formData: FormData): Promise<{
  created: number;
  failed: number;
  createdItems: Array<{ id: string; name: string; file: string; isPublic: boolean }>;
  errors: Array<{ file: string; message: string }>;
}> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const files = formData.getAll("files") as File[];
  if (files.length === 0) {
    throw new Error("Envie ao menos um arquivo .docx.");
  }

  const rawCategoryPath = (formData.get("categoryPath") as string) ?? "";
  const rawBatchPayload = (formData.get("batchPayload") as string) ?? "";

  const categoryPath = normalizeCategoryPath(rawCategoryPath);
  if (!categoryPath) {
    throw new Error("Categoria inválida. Informe ao menos um nível.");
  }
  const categoryPathKey = buildCategoryPathKey(categoryPath);
  const categoryId = await resolvePreparedTemplateCategoryId(categoryPath, categoryPathKey);

  const payload = parseBatchPayload(rawBatchPayload);
  if (payload.length === 0) {
    throw new Error("Payload de publicação em lote vazio.");
  }

  const errors: Array<{ file: string; message: string }> = [];
  const createdItems: Array<{ id: string; name: string; file: string; isPublic: boolean }> = [];
  let created = 0;

  for (const item of payload) {
    const file = files[item.index];
    const displayName = file?.name || `arquivo-${item.index + 1}`;

    try {
      if (!file) {
        throw new Error("Arquivo não encontrado para este item do lote.");
      }

      validateDocxFile(file);

      const name = sanitizeText(item.name, 255);
      if (!name) {
        throw new Error("Nome do modelo inválido.");
      }

      const slug = buildSlug(name);
      const arrayBuffer = await file.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer) as Buffer;

      buffer = await maybePrepareTemplateWithAi(buffer, "ai", item.slotFieldKeys);
      buffer = await normalizeDocxContent(buffer);
      await parseDocxPlaceholders(buffer);
      const formattingCheck = await validateDocxTemplateFormatting(buffer);

      if (!formattingCheck.isValid) {
        throw new Error("Erro de formatação após aplicar coringas revisados.");
      }

      const r2Key = await uploadPreparedTemplateToR2({
        slug,
        originalFilename: file.name,
        buffer,
        contentType: file.type || undefined,
        ownerUserId: null,
      });

      try {
        const inserted = await db.insert(preparedTemplates).values({
          slug,
          name,
          categoryId,
          storageUrl: makeR2Pointer(r2Key),
          isPublic: false,
          ownerUserId: null,
        }).returning({ id: preparedTemplates.id, name: preparedTemplates.name, isPublic: preparedTemplates.isPublic });

        if (inserted[0]) {
          createdItems.push({
            id: inserted[0].id,
            name: inserted[0].name,
            file: displayName,
            isPublic: inserted[0].isPublic,
          });
        }
      } catch (error) {
        try {
          await deleteTemplateFromR2(r2Key);
        } catch (cleanupError) {
          console.error("Erro ao limpar arquivo do R2 após falha no insert em lote:", cleanupError);
        }
        throw error;
      }

      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao publicar item do lote.";
      errors.push({ file: displayName, message });
    }
  }

  if (created > 0) {
    updateTag("prepared-templates-public");
    revalidatePath("/modelos-prontos");
    revalidatePath("/admin/modelos-prontos");
    revalidatePath("/admin/modelos-prontos/categorias");
  }

  return {
    created,
    failed: errors.length,
    createdItems,
    errors,
  };
}

export async function deletePreparedTemplateAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const id = sanitizeText((formData.get("id") as string) ?? "", 255);
  if (!id) {
    throw new Error("ID inválido.");
  }

  const [template] = await db
    .select({ id: preparedTemplates.id, storageUrl: preparedTemplates.storageUrl })
    .from(preparedTemplates)
    .where(eq(preparedTemplates.id, id))
    .limit(1);

  if (!template) {
    throw new Error("Modelo não encontrado.");
  }

  try {
    await deleteTemplateFromR2(getR2KeyFromPointer(template.storageUrl));
  } catch (error) {
    console.error("Erro ao remover arquivo do R2:", error);
  }

  await db.delete(preparedTemplates).where(eq(preparedTemplates.id, id));

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  redirect("/admin/modelos-prontos?status=deleted");
}

export async function setPreparedTemplateVisibilityAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const id = sanitizeText((formData.get("id") as string) ?? "", 255);
  const makePublic = sanitizeText((formData.get("makePublic") as string) ?? "", 10) === "true";

  if (!id) {
    throw new Error("ID inválido.");
  }

  const updated = await db
    .update(preparedTemplates)
    .set({ isPublic: makePublic })
    .where(eq(preparedTemplates.id, id))
    .returning({ id: preparedTemplates.id });

  if (updated.length === 0) {
    throw new Error("Modelo não encontrado.");
  }

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  redirect(`/admin/modelos-prontos?status=${makePublic ? "shown" : "hidden"}`);
}

export async function applyPreparedTemplateBulkAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const operation = sanitizeText((formData.get("operation") as string) ?? "", 16);
  const rawIds = formData.getAll("ids");

  const ids = Array.from(
    new Set(
      rawIds
        .map((value) => sanitizeText(String(value ?? ""), 255))
        .filter(Boolean)
    )
  );

  if (ids.length === 0) {
    redirect("/admin/modelos-prontos?status=bulk-empty");
  }

  if (operation === "show" || operation === "hide") {
    const makePublic = operation === "show";

    await db
      .update(preparedTemplates)
      .set({ isPublic: makePublic })
      .where(inArray(preparedTemplates.id, ids));

    updateTag("prepared-templates-public");
    revalidatePath("/modelos-prontos");
    revalidatePath("/admin/modelos-prontos");
    revalidatePath("/admin/modelos-prontos/lote");
    redirect(`/admin/modelos-prontos?status=${makePublic ? "bulk-shown" : "bulk-hidden"}`);
  }

  if (operation === "delete") {
    const templates = await db
      .select({ id: preparedTemplates.id, storageUrl: preparedTemplates.storageUrl })
      .from(preparedTemplates)
      .where(inArray(preparedTemplates.id, ids));

    for (const template of templates) {
      try {
        await deleteTemplateFromR2(getR2KeyFromPointer(template.storageUrl));
      } catch (error) {
        console.error("Erro ao remover arquivo do R2 em lote:", error);
      }
    }

    await db.delete(preparedTemplates).where(inArray(preparedTemplates.id, ids));

    updateTag("prepared-templates-public");
    revalidatePath("/modelos-prontos");
    revalidatePath("/admin/modelos-prontos");
    revalidatePath("/admin/modelos-prontos/lote");
    redirect("/admin/modelos-prontos?status=bulk-deleted");
  }

  throw new Error("Operação em lote inválida.");
}

export async function setPreparedTemplateVisibilityInlineAction(templateId: string, makePublic: boolean) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const id = sanitizeText(templateId, 255);
  if (!id) {
    throw new Error("ID inválido.");
  }

  const updated = await db
    .update(preparedTemplates)
    .set({ isPublic: makePublic })
    .where(eq(preparedTemplates.id, id))
    .returning({ id: preparedTemplates.id, isPublic: preparedTemplates.isPublic });

  if (updated.length === 0) {
    throw new Error("Modelo não encontrado.");
  }

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/lote");

  return { success: true, isPublic: updated[0].isPublic };
}

export async function deletePreparedTemplateInlineAction(templateId: string) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const id = sanitizeText(templateId, 255);
  if (!id) {
    throw new Error("ID inválido.");
  }

  const [template] = await db
    .select({ id: preparedTemplates.id, storageUrl: preparedTemplates.storageUrl })
    .from(preparedTemplates)
    .where(eq(preparedTemplates.id, id))
    .limit(1);

  if (!template) {
    throw new Error("Modelo não encontrado.");
  }

  try {
    await deleteTemplateFromR2(getR2KeyFromPointer(template.storageUrl));
  } catch (error) {
    console.error("Erro ao remover arquivo do R2:", error);
  }

  await db.delete(preparedTemplates).where(eq(preparedTemplates.id, id));

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/lote");

  return { success: true };
}

export async function updatePreparedTemplateCategoryAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const templateId = sanitizeText((formData.get("id") as string) ?? "", 255);
  const rawCategoryPath = (formData.get("categoryPath") as string) ?? "";

  if (!templateId) {
    throw new Error("ID inválido.");
  }

  const categoryPath = normalizeCategoryPath(rawCategoryPath);
  if (!categoryPath) {
    throw new Error("Categoria inválida. Informe ao menos um nível.");
  }

  const categoryPathKey = buildCategoryPathKey(categoryPath);
  const categoryId = await resolvePreparedTemplateCategoryId(categoryPath, categoryPathKey);

  const updated = await db
    .update(preparedTemplates)
    .set({ categoryId })
    .where(eq(preparedTemplates.id, templateId))
    .returning({ id: preparedTemplates.id });

  if (updated.length === 0) {
    throw new Error("Modelo não encontrado.");
  }

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/categorias");
  redirect("/admin/modelos-prontos/categorias?status=updated");
}

export async function createPreparedTemplateCategoryAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const rawCategoryPath = (formData.get("categoryPath") as string) ?? "";
  const categoryPath = normalizeCategoryPath(rawCategoryPath);

  if (!categoryPath) {
    throw new Error("Categoria inválida. Informe ao menos um nível.");
  }

  const categoryPathKey = buildCategoryPathKey(categoryPath);
  await resolvePreparedTemplateCategoryId(categoryPath, categoryPathKey);

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/categorias");
  redirect("/admin/modelos-prontos/categorias?status=created");
}

export async function renamePreparedTemplateCategoryAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const categoryId = sanitizeText((formData.get("id") as string) ?? "", 255);
  const rawCategoryPath = (formData.get("categoryPath") as string) ?? "";

  if (!categoryId) {
    throw new Error("ID inválido.");
  }

  const categoryPath = normalizeCategoryPath(rawCategoryPath);
  if (!categoryPath) {
    throw new Error("Categoria inválida. Informe ao menos um nível.");
  }

  const categoryPathKey = buildCategoryPathKey(categoryPath);

  const [currentCategory] = await db
    .select({
      id: preparedTemplateCategories.id,
      pathKey: preparedTemplateCategories.pathKey,
    })
    .from(preparedTemplateCategories)
    .where(eq(preparedTemplateCategories.id, categoryId))
    .limit(1);

  if (!currentCategory) {
    throw new Error("Categoria não encontrada.");
  }

  const [targetCategory] = await db
    .select({ id: preparedTemplateCategories.id })
    .from(preparedTemplateCategories)
    .where(eq(preparedTemplateCategories.pathKey, categoryPathKey))
    .limit(1);

  if (targetCategory && targetCategory.id !== categoryId) {
    await db.transaction(async (tx) => {
      await tx
        .update(preparedTemplates)
        .set({ categoryId: targetCategory.id })
        .where(eq(preparedTemplates.categoryId, categoryId));

      await tx.delete(preparedTemplateCategories).where(eq(preparedTemplateCategories.id, categoryId));
    });

    updateTag("prepared-templates-public");
    revalidatePath("/modelos-prontos");
    revalidatePath("/admin/modelos-prontos");
    revalidatePath("/admin/modelos-prontos/categorias");
    redirect("/admin/modelos-prontos/categorias?status=merged");
  }

  await db
    .update(preparedTemplateCategories)
    .set({ path: categoryPath, pathKey: categoryPathKey })
    .where(eq(preparedTemplateCategories.id, categoryId));

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/categorias");
  redirect("/admin/modelos-prontos/categorias?status=renamed");
}

export async function deletePreparedTemplateCategoryAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const categoryId = sanitizeText((formData.get("id") as string) ?? "", 255);

  if (!categoryId) {
    throw new Error("ID inválido.");
  }

  await db.delete(preparedTemplateCategories).where(eq(preparedTemplateCategories.id, categoryId));

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  revalidatePath("/admin/modelos-prontos/categorias");
  redirect("/admin/modelos-prontos/categorias?status=deleted");
}

export async function renamePreparedTemplateAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const id = sanitizeText((formData.get("id") as string) ?? "", 255);
  const newName = sanitizeText((formData.get("name") as string) ?? "", 255);

  if (!id) {
    throw new Error("ID inválido.");
  }

  if (!newName) {
    throw new Error("O nome do modelo não pode ser vazio.");
  }

  const updated = await db
    .update(preparedTemplates)
    .set({ name: newName })
    .where(eq(preparedTemplates.id, id))
    .returning({ id: preparedTemplates.id });

  if (updated.length === 0) {
    throw new Error("Modelo não encontrado.");
  }

  updateTag("prepared-templates-public");
  revalidatePath("/modelos-prontos");
  revalidatePath("/admin/modelos-prontos");
  redirect("/admin/modelos-prontos?status=renamed");
}
