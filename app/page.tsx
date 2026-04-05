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
    if (selectedTags.length > 0) {
      return (
        <div className="sm:col-span-1 p-8 text-center space-y-4 border rounded-xl bg-card shadow-sm flex flex-col items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Nenhum modelo com estas tags.</p>
        </div>
      );
    }
    return null; // Don't show anything extra if no templates, UploadTemplate is already there
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
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Painel de Modelos
            </h1>
            <p className="text-lg text-muted-foreground">
              Gerencie seus modelos docx e gere documentos personalizados.
            </p>
          </div>

          <DashboardFilter availableTags={allAvailableTags} />

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <UploadTemplate />
            <Suspense fallback={<div className="sm:col-span-1 lg:col-span-2 py-20 text-center text-muted-foreground">Carregando modelos...</div>}>
              <TemplateList searchParams={searchParams} allAvailableTags={allAvailableTags} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
