import Link from "next/link";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-chart-1/20 via-background to-chart-4/20" />
      <div className="wrapper flex min-h-[calc(100vh-5rem)] items-center justify-center py-12">
        <section className="w-full max-w-3xl rounded-3xl border border-border/70 bg-card/85 p-6 text-card-foreground shadow-xl backdrop-blur md:p-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-sm font-medium text-muted-foreground">
            <Search className="size-4" />
            Código 404: missão de busca sem sucesso
          </p>

          <h1 className="mb-4 text-4xl font-black tracking-tight md:text-5xl">
            Ops... essa página saiu para passear e não voltou.
          </h1>

          <p className="mb-6 text-base text-muted-foreground md:text-lg">
            Procuramos embaixo do teclado, atrás do monitor e até na gaveta do cafezinho.
            Nada. Talvez o link tenha envelhecido mal.
          </p>

          <div className="grid gap-3 rounded-2xl border border-border/80 bg-background/70 p-4 text-sm md:grid-cols-2">
            <p className="flex items-start gap-2">
              <Compass className="mt-0.5 size-4 text-primary" />
              Dica 1: confira se o endereço está certinho.
            </p>
            <p className="flex items-start gap-2">
              <LifeBuoy className="mt-0.5 size-4 text-primary" />
              Dica 2: se o problema insistir, a ajuda pode salvar o dia.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/modelos">
                <Home className="size-4" />
                Voltar para modelos
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/ajuda">Abrir central de ajuda</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
