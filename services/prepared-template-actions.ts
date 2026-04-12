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
import { eq, or } from "drizzle-orm";
import { getTemplateSuggestionProvider } from "@/lib/ai/template-suggester";
import { resolveCanonicalWildcardKey } from "@/lib/wildcard-catalog";

type SlotSuggestionPreview = {
  slot: number;
  fieldKey: string;
  confidence: number;
  reason?: string;
  context: string;
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
    const suggestions = await provider.suggestSlotKeys({ textWithSlots, slotCount });
    slotKeys = suggestions.map((item) => item.fieldKey);
  }

  return applyDocxSlotWildcards(buffer, slotKeys);
}

export async function suggestPreparedTemplateSlotsAction(formData: FormData): Promise<{ suggestions: SlotSuggestionPreview[] }> {
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
  const suggestions = await provider.suggestSlotKeys({ textWithSlots, slotCount });
  const contexts = extractSlotContexts(textWithSlots, slotCount);

  return {
    suggestions: suggestions.map((item) => ({
      slot: item.slot,
      fieldKey: item.fieldKey,
      confidence: item.confidence,
      reason: item.reason,
      context: contexts[item.slot] ?? "",
    })),
  };
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

export async function createPreparedTemplateAction(formData: FormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  const file = formData.get("file") as File;
  const rawName = (formData.get("name") as string) ?? "";
  const rawDescription = (formData.get("description") as string) ?? "";
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

  const description = sanitizeText(rawDescription, 1000) || null;
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

    let categoryId: string;

    if (!existingCategory) {
      try {
        const [insertedCategory] = await db
          .insert(preparedTemplateCategories)
          .values({
            path: categoryPath,
            pathKey: categoryPathKey,
          })
          .returning({ id: preparedTemplateCategories.id });

        categoryId = insertedCategory.id;
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

        categoryId = categoryAfterConflict.id;
      }
    } else {
      categoryId = existingCategory.id;
      if (existingCategory.path !== categoryPath) {
        await db
          .update(preparedTemplateCategories)
          .set({ path: categoryPath })
          .where(eq(preparedTemplateCategories.id, existingCategory.id));
      }
    }

    await db.insert(preparedTemplates).values({
      slug,
      name,
      description,
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
