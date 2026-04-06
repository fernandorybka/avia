import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { TemplateForm } from "@/components/TemplateForm";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTemplateWithDetails } from "@/services/template-services";

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const { slug } = await params;

  const result = await getTemplateWithDetails(slug, userId);

  if (!result) {
    notFound();
  }

  const { template, placeholders, pastGenerations } = result;

  return (
    <div className="min-h-screen bg-background pb-20">
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
