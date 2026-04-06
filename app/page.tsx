import { db } from "@/db";
import { templates as templatesTable } from "@/db/schema";
import { Header } from "@/components/Header";
import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { getAllUserTags } from "@/services/tag-actions";
import { DashboardContainer } from "@/components/DashboardContainer";
import { getTemplateWithDetails } from "@/services/template-services";

async function DashboardContent() {
  const { userId } = await auth();
  if (!userId) return null;

  const allAvailableTags = await getAllUserTags();

  const getCachedTemplates = unstable_cache(
    async (uid: string) => {
      return await db
        .select()
        .from(templatesTable)
        .where(eq(templatesTable.userId, uid))
        .orderBy(desc(templatesTable.createdAt));
    },
    [`templates-${userId}`],
    { tags: [`templates-${userId}`] }
  );

  const allTemplates = await getCachedTemplates(userId);

  // Prefetch details for all templates to warm up the cache
  // This makes navigation to individual templates instant
  await Promise.all(allTemplates.map(template => 
    getTemplateWithDetails(template.slug, userId)
  ));

  return (
    <DashboardContainer 
      initialTemplates={allTemplates} 
      allAvailableTags={allAvailableTags} 
    />
  );
}

export default async function HomePage() {
  await connection();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-12">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Painel de Modelos
            </h1>
            <p className="text-lg text-muted-foreground">
              Gerencie seus modelos e gere documentos personalizados.
            </p>
          </div>

          <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Carregando painel...</div>}>
            <DashboardContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
