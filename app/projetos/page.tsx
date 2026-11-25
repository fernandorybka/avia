import Link from "next/link";
import { FolderKanban, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/projects/ProjectList";
import { requireProjectManager } from "@/lib/project-guard";
import { getOwnedProjects } from "@/services/project-services";

export default async function ProjectsPage() {
  const userId = await requireProjectManager();
  const projects = await getOwnedProjects(userId);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <FolderKanban className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projetos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe orçamento, pagamentos e documentação.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/projetos/tipos">
            <ListChecks />
            Tipos de pagamento
          </Link>
        </Button>
      </div>
      <ProjectList projects={projects} />
    </>
  );
}
