import Link from "next/link";
import { ArrowLeft, FolderKanban, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

// Static headings, shared by the pages and their loading skeletons so they show up at once while data loads

export function BackToProjectsLink() {
  return (
    <Link href="/projetos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      Projetos
    </Link>
  );
}

export function ProjectsHeading() {
  return (
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
  );
}

export function PaymentTypesHeading() {
  return (
    <>
      <BackToProjectsLink />
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tipos de pagamento</h1>
          <p className="text-sm text-muted-foreground">
            Cada tipo define a documentação que o pagamento precisa ter. Vale para todos os seus projetos.
          </p>
        </div>
      </div>
    </>
  );
}
