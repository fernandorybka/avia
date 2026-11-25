"use server";

import { db } from "@/db";
import { templates, tagColors } from "@/db/schema";
import { revalidatePath, updateTag } from "next/cache";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { sanitizeTags } from "@/lib/sanitize";
import { isValidTagColor } from "@/lib/tag-colors";

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

/** Sets the color of a tag for every template of the user; null removes it. */
export async function setTagColor(tag: string, color: string | null) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [cleanTag] = sanitizeTags([tag]);
  if (!cleanTag) throw new Error("Etiqueta inválida.");

  if (color === null) {
    await db.delete(tagColors).where(and(
      eq(tagColors.userId, userId),
      eq(tagColors.tag, cleanTag)
    ));
  } else {
    if (!isValidTagColor(color)) throw new Error("Cor inválida.");

    await db.insert(tagColors)
      .values({ userId, tag: cleanTag, color })
      .onConflictDoUpdate({
        target: [tagColors.userId, tagColors.tag],
        set: { color }
      });
  }

  updateTag(`templates-${userId}`);
  return { success: true };
}
