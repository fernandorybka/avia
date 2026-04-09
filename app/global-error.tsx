"use client";

import "./globals.css";
import { Siren, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
};

export default function GlobalErrorPage({ error }: GlobalErrorPageProps) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,oklch(0.82_0.11_70/.22),transparent_55%),radial-gradient(circle_at_80%_80%,oklch(0.63_0.13_55/.22),transparent_55%)]" />

          <section className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card/90 p-6 shadow-2xl backdrop-blur md:p-10">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-sm font-medium text-muted-foreground">
              <Siren className="size-4 text-destructive" />
              Pane geral (daquelas cinematograficas)
            </p>

            <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
              A aplicacao acendeu todas as luzes do painel.
            </h1>

            <p className="mb-6 text-base text-muted-foreground md:text-lg">
              Quando isso acontece, a melhor tatica e reiniciar e fingir confianca.
              Se repetir, vale chamar suporte com o codigo abaixo.
            </p>

            <div className="rounded-2xl border border-border/80 bg-background/70 p-4 text-sm text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Codigo para investigacao:</p>
              <p className="font-mono">{error.digest ?? "sem-digest-disponivel"}</p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => window.location.reload()}>
                <RotateCcw className="size-4" />
                Recarregar pagina
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="/modelos">
                  <Home className="size-4" />
                  Voltar para modelos
                </a>
              </Button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
