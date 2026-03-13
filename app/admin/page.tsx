import Link from "next/link";
import { Users, Theater, Building2, Star, CirclePlay, Globe, Map, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const sections = [
  {
    label: "Pessoas",
    description: "Artistas, técnicos e colaboradores",
    icon: Users,
    href: "/admin/pessoas",
    newHref: "/admin/pessoas/nova",
    newLabel: "Nova Pessoa",
  },
  {
    label: "Grupos Teatrais",
    description: "Companhias e coletivos",
    icon: Theater,
    href: "/admin/grupos-teatrais",
    newHref: "/admin/grupos-teatrais/novo",
    newLabel: "Novo Grupo",
  },
  {
    label: "Espaços",
    description: "Teatros, centros culturais e outros espaços",
    icon: Building2,
    href: "/admin/espacos",
    newHref: "/admin/espacos/novo",
    newLabel: "Novo Espaço",
  },
  {
    label: "Espetáculos",
    description: "Peças e montagens",
    icon: Star,
    href: "/admin/espetaculos",
    newHref: "/admin/espetaculos/novo",
    newLabel: "Novo Espetáculo",
  },
  {
    label: "Funções de Crédito",
    description: "Direção, iluminação, produção...",
    icon: CirclePlay,
    href: "/admin/funcoes-de-credito",
    newHref: "/admin/funcoes-de-credito/nova",
    newLabel: "Nova Função",
  },
  {
    label: "Países",
    description: "Cadastro de países",
    icon: Globe,
    href: "/admin/localizacao/paises",
    newHref: "/admin/localizacao/paises/novo",
    newLabel: "Novo País",
  },
  {
    label: "Estados",
    description: "Cadastro de estados",
    icon: Map,
    href: "/admin/localizacao/estados",
    newHref: "/admin/localizacao/estados/novo",
    newLabel: "Novo Estado",
  },
  {
    label: "Cidades",
    description: "Cadastro de cidades",
    icon: MapPin,
    href: "/admin/localizacao/cidades",
    newHref: "/admin/localizacao/cidades/nova",
    newLabel: "Nova Cidade",
  },
];

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie todas as entidades do Sodré
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.href} className="rounded-xl border bg-card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link href={s.href}>Ver todos</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href={s.newHref}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {s.newLabel}
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
