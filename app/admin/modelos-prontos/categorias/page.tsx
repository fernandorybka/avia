import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { FolderTree, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  createPreparedTemplateCategoryAction,
  deletePreparedTemplateCategoryAction,
  renamePreparedTemplateCategoryAction,
} from "@/services/prepared-template-actions";
import {
  getPreparedTemplateCategoriesWithUsage,
  getPreparedTemplateCategoryPaths,
} from "@/services/prepared-template-services";

type Props = {
  searchParams: Promise<{
    status?: "created" | "renamed" | "merged" | "deleted";
  }>;
};

export default async function AdminPreparedTemplateCategoriesPage({ searchParams }: Props) {
  await connection();
  const canAccess = await isCurrentUserAdmin();

  if (!canAccess) {
    notFound();
  }

  const { status } = await searchParams;
  const [categories, categoryPathList] = await Promise.all([
    getPreparedTemplateCategoriesWithUsage(),
    getPreparedTemplateCategoryPaths(),
  ]);

  const categoryPaths = categoryPathList.map((item) => item.path);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <FolderTree className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">CRUD de Categorias</h1>
              <p className="text-muted-foreground">
                Crie, renomeie e exclua categorias da tabela de modelos prontos.
              </p>
            </div>
          </div>

          {status === "created" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Categoria criada com sucesso.
            </div>
          )}

          {status === "renamed" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              Categoria renomeada com sucesso.
            </div>
          )}

          {status === "merged" && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Categoria mesclada com outra existente e modelos foram realocados.
            </div>
          )}

          {status === "deleted" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              Categoria excluída. Modelos vinculados ficaram sem categoria.
            </div>
          )}

          <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Nova categoria</h2>
            <form action={createPreparedTemplateCategoryAction} className="flex flex-col sm:flex-row gap-3">
              <input
                name="categoryPath"
                required
                maxLength={255}
                list="prepared-template-categories-create"
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                placeholder="Ex.: Editais > PNAB > 2026"
              />
              <datalist id="prepared-template-categories-create">
                {categoryPaths.map((path) => (
                  <option key={path} value={path} />
                ))}
              </datalist>
              <Button type="submit" className="shrink-0">
                <Plus className="w-4 h-4" />
                Criar categoria
              </Button>
            </form>
          </section>

          <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Atualizar nome</TableHead>
                  <TableHead className="text-right">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhuma categoria cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-mono text-xs">{category.path}</TableCell>
                      <TableCell>{category.templatesCount} modelo(s)</TableCell>
                      <TableCell>
                        <form action={renamePreparedTemplateCategoryAction} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={category.id} />
                          <input
                            name="categoryPath"
                            defaultValue={category.path}
                            required
                            maxLength={255}
                            list={`prepared-template-categories-rename-${category.id}`}
                            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                            placeholder="Ex.: Editais > PNAB > 2026"
                          />
                          <datalist id={`prepared-template-categories-rename-${category.id}`}>
                            {categoryPaths.map((path) => (
                              <option key={`${category.id}-${path}`} value={path} />
                            ))}
                          </datalist>
                          <Button type="submit" variant="outline" size="sm" className="shrink-0">
                            <Save className="w-4 h-4" />
                            Salvar
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deletePreparedTemplateCategoryAction} className="inline-flex">
                          <input type="hidden" name="id" value={category.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </section>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/admin/modelos-prontos" className="inline-flex text-muted-foreground hover:text-foreground underline underline-offset-4">
              Voltar para modelos prontos
            </Link>
            <Link href="/modelos-prontos" className="inline-flex text-muted-foreground hover:text-foreground underline underline-offset-4">
              Ver página pública
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
