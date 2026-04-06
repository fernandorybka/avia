"use server";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { revalidatePath, revalidateTag } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function updateTemplateTags(templateId: string, tags: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Clean tags: trim and remove empty
  const cleanTags = tags
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .filter((v, i, a) => a.indexOf(v) === i); // Unique

  await db.update(templates)
    .set({ tags: cleanTags })
    .where(and(
      eq(templates.id, templateId),
      eq(templates.userId, userId)
    ));

  revalidateTag(`templates-${userId}`, 'max');
  revalidatePath("/");
  return { success: true };
}

export async function getAllUserTags() {
  const { userId } = await auth();
  if (!userId) return [];

  const results = await db
    .select({ tags: templates.tags })
    .from(templates)
    .where(eq(templates.userId, userId));

  const allTags = new Set<string>();
  results.forEach(row => {
    (row.tags || []).forEach(tag => allTags.add(tag));
  });

  return Array.from(allTags).sort();
}
