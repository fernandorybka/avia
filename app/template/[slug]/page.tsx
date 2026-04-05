import { db } from "@/db";
import { templates, templatePlaceholders, documentGenerations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TemplateForm } from "@/components/TemplateForm";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { unstable_cache } from "next/cache";

export default async function TemplatePage({ params }: { params: { slug: string } }) {
  await connection();
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const { slug } = await params;

  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.slug, slug))
    .limit(1);

  if (!template) {
    notFound();
  }

  const getCachedTemplateData = unstable_cache(
    async (tid: string, uid: string) => {
      const [placeholders, pastGenerations] = await Promise.all([
        db
          .select()
          .from(templatePlaceholders)
          .where(eq(templatePlaceholders.templateId, tid))
          .orderBy(templatePlaceholders.createdAt),
        db
          .select({
            id: documentGenerations.id,
            name: documentGenerations.name
          })
          .from(documentGenerations)
          .where(eq(documentGenerations.userId, uid))
      ]);
      return { placeholders, pastGenerations };
    },
    [`template-${template.id}-${userId}`],
    { tags: [`template-${template.id}-${userId}`, `cadastros-${userId}`] }
  );

  const { placeholders, pastGenerations } = await getCachedTemplateData(template.id, userId);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-12">
        <TemplateForm 
          templateId={template.id} 
          templateName={template.name} 
          placeholders={placeholders} 
          pastGenerations={pastGenerations}
        />
      </main>
    </div>
  );
}
