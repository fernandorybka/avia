import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Layers } from "lucide-react";
import { AdminPreparedTemplateBatchForm } from "@/components/AdminPreparedTemplateBatchForm";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getPreparedTemplateCategoryPaths } from "@/services/prepared-template-services";

export default async function AdminPreparedTemplatesBatchPage() {
  await connection();
  const canAccess = await isCurrentUserAdmin();

  if (!canAccess) {
    notFound();
  }

  const categories = await getPreparedTemplateCategoryPaths();
  const categoryPaths = categories.map((category) => category.path);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Publicação em Lote
              </h1>
              <p className="text-muted-foreground">
                Envie vários documentos de edital, revise os coringas e publique todos em um único fluxo.
              </p>
            </div>
          </div>

          <AdminPreparedTemplateBatchForm categoryPaths={categoryPaths} />

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/admin/modelos-prontos" className="inline-flex text-muted-foreground hover:text-foreground underline underline-offset-4">
              Voltar para modelos prontos
            </Link>
            <Link href="/admin/modelos-prontos/categorias" className="inline-flex text-muted-foreground hover:text-foreground underline underline-offset-4">
              Gerenciar categorias
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
