"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-destructive/10 via-background to-chart-2/20" />
      <div className="wrapper flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
        <section className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card/90 p-6 text-card-foreground shadow-xl backdrop-blur md:p-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-sm font-medium text-muted-foreground">
            <AlertTriangle className="size-4 text-destructive" />
            Erro inesperado no hangar
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
            A engrenagem deu uma tossida e travou.
          </h1>

          <p className="mb-6 text-base text-muted-foreground md:text-lg">
            Não foi sua culpa. O sistema tropeçou no próprio cadarço e estamos tentando
            levantar com dignidade.
          </p>

          <div className="rounded-2xl border border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Detalhe técnico para suporte:</p>
            <p className="font-mono">{error.digest ?? "sem-digest-disponivel"}</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button size="lg" onClick={reset}>
              <RefreshCw className="size-4" />
              Tentar de novo
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/modelos">
                <Wrench className="size-4" />
                Ir para uma area segura
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
