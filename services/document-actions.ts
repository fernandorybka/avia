"use server";

import { db } from "@/db";
import { 
  templates, 
  templatePlaceholders, 
  documentGenerations, 
  documentGenerationValues 
} from "@/db/schema";
import { parseDocxPlaceholders } from "@/lib/docx-utils";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";


export async function uploadTemplateAction(formData: FormData) {
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;

  if (!file || !name) {
    throw new Error("File and name are required");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
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

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [template] = await db.insert(templates).values({
    name,
    slug,
    userId,
    content: text,
    storageUrl: buffer.toString('base64'), // Mock storage, just store base64 for now
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

  revalidateTag(`templates-${userId}`, 'max');
  revalidatePath("/");
  revalidatePath("/cadastros");
  redirect(`/template/${template.slug}`);
}



export async function createGenerationAction(
  templateId: string, 
  generationName: string,
  values: Record<string, string>,
  shouldSave: Record<string, boolean>
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

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

  const upsertPromises = Object.entries(values).map(async ([fieldKey, fieldValue]) => {
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

  revalidateTag(`cadastros-${userId}`, 'max');
  revalidatePath("/cadastros");
  revalidatePath(`/template/${templateId}`);

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

  revalidateTag(`cadastros-${userId}`, 'max');
  revalidatePath("/cadastros");
  return { success: true };
}
export async function deleteTemplateAction(templateId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(templates).where(and(
    eq(templates.id, templateId),
    eq(templates.userId, userId)
  ));

  revalidateTag(`templates-${userId}`, 'max');
  revalidatePath("/");
  revalidatePath("/cadastros");
  return { success: true };
}
