import { db } from "@/db";
import { templates as templatesTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { getAllUserTags } from "@/services/tag-actions";
import { DashboardContainer } from "@/components/DashboardContainer";
import { getTemplateWithDetails } from "@/services/template-services";
import { FileText, PackageOpen } from "lucide-react";
import { WorkflowInfographic } from "@/components/WorkflowInfographic";
import { Button } from "@/components/ui/button";

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
    ["templates-list"],
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

export default async function ModelosPage() {
  await connection();

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
  
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
               <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Modelos
              </h1>
              <p className="text-muted-foreground">
                Geração de documentos a partir de modelos pré-configurados.
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <PackageOpen className="w-4 h-4 text-primary" />
                Quer ganhar tempo?
              </p>
              <p className="text-sm text-muted-foreground">
                Antes de criar um modelo do zero, veja se ele já está disponível em <strong>Modelos Prontos</strong>.
              </p>
            </div>
            <Link href="/modelos-prontos" className="shrink-0">
              <Button>
                <PackageOpen className="w-4 h-4" />
                Ver Modelos Prontos
              </Button>
            </Link>
          </section>

          <WorkflowInfographic />

          <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Carregando painel...</div>}>
            <DashboardContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
