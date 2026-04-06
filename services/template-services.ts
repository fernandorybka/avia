import { db } from "@/db";
import { templates, templatePlaceholders, documentGenerations } from "@/db/schema";
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

      const [placeholders, pastGenerations] = await Promise.all([
        db
          .select()
          .from(templatePlaceholders)
          .where(eq(templatePlaceholders.templateId, template.id))
          .orderBy(templatePlaceholders.createdAt),
        db
          .select({
            id: documentGenerations.id,
            name: documentGenerations.name
          })
          .from(documentGenerations)
          .where(eq(documentGenerations.userId, u))
          .orderBy(documentGenerations.createdAt)
      ]);

      return { 
        template, 
        placeholders, 
        pastGenerations 
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
