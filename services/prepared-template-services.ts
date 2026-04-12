import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { preparedTemplateCategories, preparedTemplates } from "@/db/schema";
import { isCurrentUserAdmin } from "@/lib/admin";

export async function getPublicPreparedTemplates() {
  const cachedFn = unstable_cache(
    async () => {
      return await db
        .select({
          id: preparedTemplates.id,
          slug: preparedTemplates.slug,
          name: preparedTemplates.name,
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

  const isAdmin = await isCurrentUserAdmin();

  if (isAdmin) {
    const [template] = await db
      .select()
      .from(preparedTemplates)
      .where(eq(preparedTemplates.id, templateId))
      .limit(1);

    return template ?? null;
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

export async function getPreparedTemplateCategoriesWithUsage() {
  return await db
    .select({
      id: preparedTemplateCategories.id,
      path: preparedTemplateCategories.path,
      pathKey: preparedTemplateCategories.pathKey,
      createdAt: preparedTemplateCategories.createdAt,
      templatesCount: sql<number>`count(${preparedTemplates.id})::int`,
    })
    .from(preparedTemplateCategories)
    .leftJoin(
      preparedTemplates,
      eq(preparedTemplates.categoryId, preparedTemplateCategories.id)
    )
    .groupBy(
      preparedTemplateCategories.id,
      preparedTemplateCategories.path,
      preparedTemplateCategories.pathKey,
      preparedTemplateCategories.createdAt
    )
    .orderBy(preparedTemplateCategories.path);
}
