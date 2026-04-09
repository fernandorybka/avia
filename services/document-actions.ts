"use server";

import { db } from "@/db";
import { 
  templates, 
  templatePlaceholders, 
  documentGenerations, 
  documentGenerationValues 
} from "@/db/schema";
import { parseDocxPlaceholders, normalizeDocxContent } from "@/lib/docx-utils";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { sanitizeText, sanitizeRecord, sanitizeTags } from "@/lib/sanitize";
import {
  deleteTemplateFromR2,
  getR2KeyFromPointer,
  makeR2Pointer,
  uploadTemplateToR2,
} from "@/lib/r2";


export async function uploadTemplateAction(formData: FormData) {
  const file = formData.get("file") as File;
  const rawName = formData.get("name") as string;
  const rawTags = formData.getAll("tags") as string[];

  if (!file || !rawName) {
    throw new Error("File and name are required");
  }

  const name = sanitizeText(rawName, 255);
  if (!name) throw new Error("O nome do modelo é inválido.");

  const tags = sanitizeTags(rawTags);

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer) as Buffer;
  
  // Normalize wildcards within the document itself before saving
  buffer = await normalizeDocxContent(buffer);
  
  const { text, placeholders } = await parseDocxPlaceholders(buffer);

  // Generate a basic slug
  let slug = name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, '-');
    
  // Simple deduplication logic: append a short random string
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  slug = `${slug}-${randomSuffix}`;

  let r2Key: string;
  try {
    r2Key = await uploadTemplateToR2({
      userId,
      slug,
      originalFilename: file.name,
      buffer,
      contentType: file.type || undefined,
    });
  } catch (error) {
    console.error("Erro ao enviar modelo para o R2:", error);
    throw new Error(
      "Ops, o armazenamento deu uma tropeçada. Não foi possível enviar seu modelo agora. Verifique a configuração do R2 e tente novamente."
    );
  }

  const [template] = await db.insert(templates).values({
    name,
    slug,
    userId,
    content: text,
    tags,
    storageUrl: makeR2Pointer(r2Key),
  }).returning();

  if (placeholders.length > 0) {
    await db.insert(templatePlaceholders).values(
      placeholders.map(p => ({
        templateId: template.id,
        placeholder: p.placeholder,
        fieldKey: p.fieldKey
      }))
    );
  }

  updateTag(`templates-${userId}`);
  revalidatePath("/modelos");
  revalidatePath("/cadastros");
  redirect(`/modelo/${template.slug}`);
}



export async function createGenerationAction(
  templateId: string,
  rawGenerationName: string,
  values: Record<string, string>,
  shouldSave: Record<string, boolean>
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const generationName = sanitizeText(rawGenerationName, 255);
  if (!generationName) throw new Error("O nome do cadastro é inválido.");

  const sanitizedValues = sanitizeRecord(values);

  let [generation] = await db
    .select()
    .from(documentGenerations)
    .where(and(
      eq(documentGenerations.userId, userId),
      eq(documentGenerations.name, generationName)
    ))
    .limit(1);

  if (!generation) {
    const inserted = await db.insert(documentGenerations).values({
      name: generationName,
      userId,
    }).returning();
    generation = inserted[0];
  }

  const upsertPromises = Object.entries(sanitizedValues).map(async ([fieldKey, fieldValue]) => {
    if (!shouldSave[fieldKey]) {
      await db.delete(documentGenerationValues)
        .where(and(
          eq(documentGenerationValues.generationId, generation.id),
          eq(documentGenerationValues.fieldKey, fieldKey)
        ));
    } else {
      await db.insert(documentGenerationValues)
        .values({
          generationId: generation.id,
          fieldKey,
          fieldValue,
        })
        .onConflictDoUpdate({
          target: [documentGenerationValues.generationId, documentGenerationValues.fieldKey],
          set: { fieldValue }
        });
    }
  });

  await Promise.all(upsertPromises);

  updateTag(`cadastros-${userId}`);
  revalidatePath("/cadastros");
  revalidatePath(`/modelo/${templateId}`);

  return { success: true, generationId: generation.id };
}

export async function fetchGenerationValuesAction(generationId: string) {
  return await db
    .select()
    .from(documentGenerationValues)
    .where(eq(documentGenerationValues.generationId, generationId));
}

export async function deleteGenerationAction(generationId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(documentGenerations).where(and(
    eq(documentGenerations.id, generationId),
    eq(documentGenerations.userId, userId)
  ));

  updateTag(`cadastros-${userId}`);
  revalidatePath("/cadastros");
  return { success: true };
}
export async function deleteTemplateAction(templateId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [template] = await db
    .select({ storageUrl: templates.storageUrl })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .limit(1);

  if (!template) {
    throw new Error("Template não encontrado.");
  }

  if (!template.storageUrl) {
    throw new Error("Template sem referencia de armazenamento no R2.");
  }

  try {
    await deleteTemplateFromR2(getR2KeyFromPointer(template.storageUrl));
  } catch (error) {
    console.error("Erro ao remover arquivo do R2:", error);
  }

  await db.delete(templates).where(and(
    eq(templates.id, templateId),
    eq(templates.userId, userId)
  ));

  updateTag(`templates-${userId}`);
  revalidatePath("/modelos");
  revalidatePath("/cadastros");
  return { success: true };
}
