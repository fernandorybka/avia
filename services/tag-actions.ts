"use server";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { sanitizeTags } from "@/lib/sanitize";

export async function updateTemplateTags(templateId: string, tags: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Sanitize: remove control chars, strip empty, deduplicate, limit each tag to 100 chars
  const cleanTags = sanitizeTags(tags);

  await db.update(templates)
    .set({ tags: cleanTags })
    .where(and(
      eq(templates.id, templateId),
      eq(templates.userId, userId)
    ));

  updateTag(`templates-${userId}`);
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
