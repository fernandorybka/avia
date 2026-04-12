import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Eye, EyeOff, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPreparedTemplateForm } from "@/components/AdminPreparedTemplateForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  deletePreparedTemplateAction,
  setPreparedTemplateVisibilityAction,
} from "@/services/prepared-template-actions";
import {
  getAllPreparedTemplates,
  getPreparedTemplateCategoryPaths,
} from "@/services/prepared-template-services";

type Props = {
  searchParams: Promise<{ status?: "uploaded" | "deleted" | "hidden" | "shown" }>;
};

export default async function AdminPreparedTemplatesPage({ searchParams }: Props) {
  await connection();
  const canAccess = await isCurrentUserAdmin();

  if (!canAccess) {
    notFound();
  }

  const { status } = await searchParams;
  const [templates, categories] = await Promise.all([
    getAllPreparedTemplates(),
    getPreparedTemplateCategoryPaths(),
  ]);
  const categoryPaths = categories.map((category) => category.path);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Admin de Modelos Prontos
              </h1>
              <p className="text-muted-foreground">
                Cadastre e gerencie os arquivos pré-configurados disponíveis para download por categoria.
              </p>
            </div>
          </div>

          {status === "uploaded" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Modelo pronto publicado com sucesso.
            </div>
          )}

          {status === "deleted" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Modelo pronto removido com sucesso.
            </div>
          )}

          {status === "hidden" && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Modelo pronto ocultado da área pública com sucesso.
            </div>
          )}

          {status === "shown" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Modelo pronto exibido novamente para usuários.
            </div>
          )}

          <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Novo modelo pronto</h2>
            <AdminPreparedTemplateForm categoryPaths={categoryPaths} />
            <Link href="/modelos-prontos" className="inline-flex text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
              Ver página pública
            </Link>
          </section>

          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Visibilidade</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum modelo pronto cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-mono text-xs">{template.categoryPath || "Sem categoria"}</TableCell>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-[28rem] truncate">
                        {template.description || "-"}
                      </TableCell>
                      <TableCell>{template.isPublic ? "Público" : "Oculto"}</TableCell>
                      <TableCell>
                        {new Date(template.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <form action={setPreparedTemplateVisibilityAction} className="inline-flex">
                            <input type="hidden" name="id" value={template.id} />
                            <input type="hidden" name="makePublic" value={template.isPublic ? "false" : "true"} />
                            <Button type="submit" variant="outline" size="sm">
                              {template.isPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              {template.isPublic ? "Esconder" : "Exibir"}
                            </Button>
                          </form>

                          <form action={deletePreparedTemplateAction} className="inline-flex">
                            <input type="hidden" name="id" value={template.id} />
                            <Button type="submit" variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>
        </div>
      </main>
    </div>
  );
}
