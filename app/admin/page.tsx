import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Settings2, PackageOpen } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  await connection();
  const canAccess = await isCurrentUserAdmin();

  if (!canAccess) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Settings2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin</h1>
              <p className="text-muted-foreground">Acesse os módulos administrativos disponíveis.</p>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
              <div className="inline-flex w-10 h-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PackageOpen className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Modelos Prontos</h2>
              <p className="text-sm text-muted-foreground">
                Faça upload e gerencie os modelos públicos preparados para download.
              </p>
              <Button asChild size="sm">
                <Link href="/admin/modelos-prontos">Abrir módulo</Link>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
