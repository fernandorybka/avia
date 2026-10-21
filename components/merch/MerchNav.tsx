"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/merch", label: "Vender" },
  { href: "/merch/products", label: "Estoque" },
  { href: "/merch/sales", label: "Vendas" },
];

export function MerchNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visibleTabs = isAdmin ? [...tabs, { href: "/merch/team", label: "Equipe" }] : tabs;

  return (
    <nav className={cn("grid gap-1 rounded-xl bg-muted p-1", isAdmin ? "grid-cols-4" : "grid-cols-3")}>
      {visibleTabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg py-2 text-center text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
