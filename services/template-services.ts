import { db } from "@/db";
import { templates, templatePlaceholders, documentGenerations, tagColors, cadastroGroupOrder } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { unstable_cache } from "next/cache";

/**
 * Fetches a template by slug, including its placeholders and the user's past generations.
 * This function is cached to improve performance when entering a model page.
 * We wrap the unstable_cache to allow user-specific tags for accurate invalidation.
 */
export async function getTemplateWithDetails(slug: string, userId: string) {
  const cachedFn = unstable_cache(
    async (s: string, u: string) => {
      const [template] = await db
        .select()
        .from(templates)
        .where(and(eq(templates.slug, s), eq(templates.userId, u)))
        .limit(1);

      if (!template) return null;

      const [placeholders, pastGenerations, groupOrder] = await Promise.all([
        db
          .select()
          .from(templatePlaceholders)
          .where(eq(templatePlaceholders.templateId, template.id))
          .orderBy(templatePlaceholders.createdAt),
        db
          .select({
            id: documentGenerations.id,
            name: documentGenerations.name,
            groupName: documentGenerations.groupName
          })
          .from(documentGenerations)
          .where(eq(documentGenerations.userId, u))
          .orderBy(documentGenerations.name),
        fetchGroupOrder(u)
      ]);

      return { 
        template, 
        placeholders, 
        pastGenerations,
        groupOrder
      };
    },
    ["template-detail"],
    { 
      revalidate: 3600, 
      tags: [`templates-${userId}`, `cadastros-${userId}`] 
    }
  );

  return cachedFn(slug, userId);
}

/** Level names in the user's custom order (uncached; callers cache it with their own data). */
export async function fetchGroupOrder(userId: string): Promise<string[]> {
  const rows = await db
    .select({ groupName: cadastroGroupOrder.groupName })
    .from(cadastroGroupOrder)
    .where(eq(cadastroGroupOrder.userId, userId))
    .orderBy(cadastroGroupOrder.position);

  return rows.map(row => row.groupName);
}

/** Tag name -> color for the user, cached alongside the templates list. */
export async function getTagColors(userId: string): Promise<Record<string, string>> {
  const cachedFn = unstable_cache(
    async (u: string) => {
      const rows = await db
        .select({ tag: tagColors.tag, color: tagColors.color })
        .from(tagColors)
        .where(eq(tagColors.userId, u));

      return Object.fromEntries(rows.map(row => [row.tag, row.color]));
    },
    ["tag-colors"],
    { tags: [`templates-${userId}`] }
  );

  return cachedFn(userId);
}
