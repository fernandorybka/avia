import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, or } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { preparedTemplateCategories, preparedTemplates } from "@/db/schema";

export async function getPublicPreparedTemplates() {
  const cachedFn = unstable_cache(
    async () => {
      return await db
        .select({
          id: preparedTemplates.id,
          slug: preparedTemplates.slug,
          name: preparedTemplates.name,
          description: preparedTemplates.description,
          createdAt: preparedTemplates.createdAt,
          categoryPath: preparedTemplateCategories.path,
        })
        .from(preparedTemplates)
        .leftJoin(
          preparedTemplateCategories,
          eq(preparedTemplates.categoryId, preparedTemplateCategories.id)
        )
        .where(eq(preparedTemplates.isPublic, true))
        .orderBy(desc(preparedTemplates.createdAt));
    },
    ["prepared-templates-public"],
    { tags: ["prepared-templates-public"] }
  );

  return cachedFn();
}

export async function getPreparedTemplateForCurrentUser(templateId: string) {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const [template] = await db
    .select()
    .from(preparedTemplates)
    .where(
      and(
        eq(preparedTemplates.id, templateId),
        or(
          eq(preparedTemplates.isPublic, true),
          eq(preparedTemplates.ownerUserId, userId)
        )
      )
    )
    .limit(1);

  return template ?? null;
}

export async function getAllPreparedTemplates() {
  return await db
    .select({
      id: preparedTemplates.id,
      slug: preparedTemplates.slug,
      name: preparedTemplates.name,
      description: preparedTemplates.description,
      createdAt: preparedTemplates.createdAt,
      isPublic: preparedTemplates.isPublic,
      categoryPath: preparedTemplateCategories.path,
    })
    .from(preparedTemplates)
    .leftJoin(
      preparedTemplateCategories,
      eq(preparedTemplates.categoryId, preparedTemplateCategories.id)
    )
    .orderBy(desc(preparedTemplates.createdAt));
}

export async function getPreparedTemplateCategoryPaths() {
  return await db
    .select({ path: preparedTemplateCategories.path })
    .from(preparedTemplateCategories)
    .orderBy(preparedTemplateCategories.path);
}
