import Link from "next/link";
import { Users, Theater, MapPin, Star, CirclePlay, Globe, Map, Building2 } from "lucide-react";

const sections = [
  {
    label: "Pessoas",
    href: "/admin/pessoas",
    icon: Users,
    newHref: "/admin/pessoas/nova",
  },
  {
    label: "Grupos Teatrais",
    href: "/admin/grupos-teatrais",
    icon: Theater,
    newHref: "/admin/grupos-teatrais/novo",
  },
  {
    label: "Espaços",
    href: "/admin/espacos",
    icon: Building2,
    newHref: "/admin/espacos/novo",
  },
  {
    label: "Espetáculos",
    href: "/admin/espetaculos",
    icon: Star,
    newHref: "/admin/espetaculos/novo",
  },
  {
    label: "Funções de Crédito",
    href: "/admin/funcoes-de-credito",
    icon: CirclePlay,
    newHref: "/admin/funcoes-de-credito/nova",
  },
  {
    label: "Países",
    href: "/admin/localizacao/paises",
    icon: Globe,
    newHref: "/admin/localizacao/paises/novo",
  },
  {
    label: "Estados",
    href: "/admin/localizacao/estados",
    icon: Map,
    newHref: "/admin/localizacao/estados/novo",
  },
  {
    label: "Cidades",
    href: "/admin/localizacao/cidades",
    icon: MapPin,
    newHref: "/admin/localizacao/cidades/nova",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/admin" className="font-bold text-lg tracking-tight">
            Admin
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
