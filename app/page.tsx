import { db } from "@/db";
import { templates } from "@/db/schema";
import { Header } from "@/components/Header";
import { UploadTemplate } from "@/components/UploadTemplate";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowRight } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { Suspense } from "react";

import { unstable_cache } from "next/cache";

import { getAllUserTags } from "@/services/tag-actions";
import { DashboardFilter } from "@/components/DashboardFilter";
import { TemplateCard } from "@/components/TemplateCard";

async function TemplateList({ searchParams, allAvailableTags }: { 
  searchParams: { tags?: string }, 
  allAvailableTags: string[] 
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const selectedTags = searchParams.tags ? searchParams.tags.split(",") : [];

  const getCachedTemplates = unstable_cache(
    async (uid: string) => {
      return await db
        .select()
        .from(templates)
        .where(eq(templates.userId, uid))
        .orderBy(desc(templates.createdAt));
    },
    [`templates-${userId}`],
    { tags: [`templates-${userId}`] }
  );

  let allTemplates = await getCachedTemplates(userId);

  // Filter by tags if any selected (Additive OR logic)
  if (selectedTags.length > 0) {
    allTemplates = allTemplates.filter(template => 
      selectedTags.some(tag => (template.tags || []).includes(tag))
    );
  }

  if (allTemplates.length === 0) {
    return (
      <div className="sm:col-span-2 py-20 text-center space-y-4 border rounded-xl bg-card shadow-sm">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground">
            {selectedTags.length > 0 ? "Nenhum modelo com estas tags" : "Nenhum modelo ainda"}
          </h3>
          <p className="text-muted-foreground">
            {selectedTags.length > 0 
              ? "Tente remover alguns filtros para encontrar o que procura." 
              : "Envie seu primeiro .docx para começar."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {allTemplates.map((template) => (
        <TemplateCard 
          key={template.id} 
          template={template} 
          allAvailableTags={allAvailableTags} 
        />
      ))}
    </>
  );
}

export default async function HomePage(props: { 
  searchParams: Promise<{ tags?: string }> 
}) {
  const searchParams = await props.searchParams;
  const allAvailableTags = await getAllUserTags();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-12">
        <div className="grid lg:grid-cols-[1fr_380px] gap-12 items-start">
          
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Painel de Modelos
              </h1>
              <p className="text-lg text-muted-foreground">
                Gerencie seus modelos docx e gere documentos personalizados.
              </p>
            </div>

            <DashboardFilter availableTags={allAvailableTags} />

            <div className="grid sm:grid-cols-2 gap-4">
              <Suspense fallback={<div className="sm:col-span-2 py-20 text-center text-muted-foreground">Carregando modelos...</div>}>
                <TemplateList searchParams={searchParams} allAvailableTags={allAvailableTags} />
              </Suspense>
            </div>
          </div>

          <aside className="sticky top-28 space-y-6">
            <UploadTemplate />
            
            <div className="p-6 rounded-2xl bg-accent text-accent-foreground shadow-xl shadow-accent/20">
              <h3 className="font-bold text-lg mb-4">Como funciona</h3>
              <ul className="space-y-4 text-accent-foreground/90 text-sm">
                <li className="flex gap-4">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-accent-foreground/20 flex items-center justify-center text-xs font-bold">1</span>
                  <p>Envie um docx com marcadores <code className="bg-accent-foreground/10 px-1 rounded text-accent-foreground">##NOME##</code></p>
                </li>
                <li className="flex gap-4">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-accent-foreground/20 flex items-center justify-center text-xs font-bold">2</span>
                  <p>Os campos são extraídos automaticamente</p>
                </li>
                <li className="flex gap-4">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-accent-foreground/20 flex items-center justify-center text-xs font-bold">3</span>
                  <p>Preencha o formulário e salve as gerações</p>
                </li>
              </ul>
            </div>
          </aside>

        </div>
      </main>
    </div>
  );
}
