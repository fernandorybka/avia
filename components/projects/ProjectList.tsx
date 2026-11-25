"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "@/services/project-actions";
import type { ProjectListItem } from "@/services/project-services";

function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2 rounded-2xl border border-dashed p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        startTransition(async () => {
          const result = await createProjectAction(name);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          router.push(`/projetos/${result.data.id}/orcamento`);
        });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do novo projeto" maxLength={150} />
      <Button type="submit" size="lg" disabled={pending || !name.trim()}>
        <Plus />
        Criar
      </Button>
    </form>
  );
}

export function ProjectList({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="space-y-4">
      <NewProjectForm />
      {projects.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Nenhum projeto ainda. Crie o primeiro e suba a planilha de orçamento.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={project.hasBudget ? `/projetos/${project.id}` : `/projetos/${project.id}/orcamento`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{project.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {project.hasBudget ? "Orçamento importado" : "Sem orçamento ainda"}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
