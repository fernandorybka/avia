import { db } from "@/db";
import { templates as templatesTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { after, connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { DashboardContainer } from "@/components/DashboardContainer";
import { getTagColors, getTemplateWithDetails } from "@/services/template-services";
import { FileText, PackageOpen } from "lucide-react";
import { WorkflowInfographic } from "@/components/WorkflowInfographic";
import { Button } from "@/components/ui/button";
import { paginate, parseListParam, parsePageParam, TEMPLATES_PER_PAGE } from "@/lib/pagination";

type ModelosSearchParams = { pagina?: string | string[]; etiqueta?: string | string[] };

async function DashboardContent({ searchParams }: { searchParams: Promise<ModelosSearchParams> }) {
  const { userId } = await auth();
  if (!userId) return null;

  const getCachedTemplates = unstable_cache(
    async (uid: string) => {
      // Only what the cards need: `content` holds the whole extracted document text
      // and would otherwise be serialized to the browser for every template.
      return await db
        .select({
          id: templatesTable.id,
          name: templatesTable.name,
          slug: templatesTable.slug,
          tags: templatesTable.tags,
          createdAt: templatesTable.createdAt,
        })
        .from(templatesTable)
        .where(eq(templatesTable.userId, uid))
        .orderBy(desc(templatesTable.createdAt));
    },
    ["templates-list-cards"],
    { tags: [`templates-${userId}`] }
  );

  const [allTemplates, tagColors] = await Promise.all([
    getCachedTemplates(userId),
    getTagColors(userId),
  ]);

  // Derived from the list above instead of querying every template again
  const allAvailableTags = Array.from(
    new Set(allTemplates.flatMap(template => template.tags || []))
  ).sort();

  // Filter and paginate here so the browser only receives the cards it shows
  const params = await searchParams;
  const selectedTags = parseListParam(params.etiqueta).filter(tag => allAvailableTags.includes(tag));
  const filteredTemplates = selectedTags.length === 0
    ? allTemplates
    : allTemplates.filter(template => selectedTags.some(tag => (template.tags || []).includes(tag)));
  const currentPage = paginate(filteredTemplates, parsePageParam(params.pagina), TEMPLATES_PER_PAGE);

  // Warm the cache of the models on this page after the response is sent, so opening
  // one stays fast without making the list wait for 3 queries per model.
  after(() =>
    Promise.all(currentPage.items.map(template => getTemplateWithDetails(template.slug, userId)))
  );

  return (
    <DashboardContainer 
      initialTemplates={currentPage.items}
      allAvailableTags={allAvailableTags}
      selectedTags={selectedTags}
      page={currentPage.page}
      totalPages={currentPage.totalPages}
      totalTemplates={currentPage.totalItems}
      tagColors={tagColors}
    />
  );
}

export default async function ModelosPage({ searchParams }: { searchParams: Promise<ModelosSearchParams> }) {
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
            <DashboardContent searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
