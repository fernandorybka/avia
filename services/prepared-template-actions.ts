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
  normalizeDocxContent,
  parseDocxPlaceholders,
  validateDocxTemplateFormatting,
} from "@/lib/docx-utils";
import { eq } from "drizzle-orm";

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

  if (!file || !rawName) {
    throw new Error("Arquivo e nome são obrigatórios.");
  }

  if (!(file.name || "").toLowerCase().endsWith(".docx")) {
    throw new Error("Formato não suportado. Envie apenas arquivos .docx.");
  }

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
    const [category] = await db
      .insert(preparedTemplateCategories)
      .values({
        path: categoryPath,
        pathKey: categoryPathKey,
      })
      .onConflictDoUpdate({
        target: preparedTemplateCategories.pathKey,
        set: { path: categoryPath },
      })
      .returning({ id: preparedTemplateCategories.id });

    await db.insert(preparedTemplates).values({
      slug,
      name,
      description,
      categoryId: category.id,
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
