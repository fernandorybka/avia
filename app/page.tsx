import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen pt-16">
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-[#ff3939]/10 rounded-full blur-3xl -z-10" />

        {/* Logo Hero */}
        <h1 className="font-logo font-normal text-7xl sm:text-9xl md:text-[10rem] tracking-tight text-[#ff3939] drop-shadow-sm mb-6 mt-8 sm:mt-12 transition-all hover:scale-105 duration-500 select-none">
          avia!
        </h1>
        
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6 max-w-4xl text-foreground/90">
          Uma plataforma para <span className="text-[#ff3939]">agilizar</span> sua Produção Cultural.
        </h2>
        
        <p className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl">
          Menos tempo com burocracia, mais tempo para a sua arte. 
          Ferramentas, modelos dinâmicos e gestão simplificada.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 mb-24 w-full sm:w-auto px-4">
          <Link href="/modelos" className="w-full sm:w-auto">
            <Button size="lg" className="w-full px-8 text-base h-14 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              Começar a Usar
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/ajuda" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full px-8 text-base h-14 border-2 transition-all">
              Como Funciona?
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
