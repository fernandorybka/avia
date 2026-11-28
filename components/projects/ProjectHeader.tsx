"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { FolderKanban, GanttChart, ListTree, Wallet } from "lucide-react";
import { ConfirmDeleteButton, EditableCell } from "@/components/shared/editable";
import { cn } from "@/lib/utils";
import { deleteProjectAction, renameProjectAction } from "@/services/project-actions";
import { BackToProjectsLink } from "./ProjectsHeading";

export function projectTabs(projectId: string) {
  const base = `/projetos/${projectId}`;
  return [
    { href: base, label: "Linha do tempo", icon: GanttChart },
    { href: `${base}/rubricas`, label: "Rubricas", icon: ListTree },
    { href: `${base}/orcamento`, label: "Orçamento", icon: Wallet },
  ];
}

export const PROJECT_TABS_NAV = "-mx-1 !mt-8 flex gap-4 overflow-x-auto border-b border-border px-1 [scrollbar-width:none]";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className={PROJECT_TABS_NAV}>
      {projectTabs(projectId).map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative -mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-3 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "size-4 transition-colors",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ProjectIcon() {
  return (
    <div className="w-11 h-11 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
      <FolderKanban className="w-5 h-5" />
    </div>
  );
}

export function ProjectHeader({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={cn("space-y-4", pending && "opacity-60")}>
      <BackToProjectsLink />
      <div className="flex items-center gap-3">
        <ProjectIcon />
        <EditableCell
          value={name}
          aria-label="Nome do projeto"
          maxLength={150}
          className="flex-1 text-2xl font-bold tracking-tight text-foreground"
          onSave={(next) => renameProjectAction(projectId, next)}
        />
        <ConfirmDeleteButton
          label="Excluir projeto"
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteProjectAction(projectId);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success("Projeto excluído");
              router.push("/projetos");
            })
          }
        />
      </div>
      <ProjectTabs projectId={projectId} />
    </div>
  );
}
