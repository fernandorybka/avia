"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  canAccessAdmin: boolean;
};

const mainLinks = [
  { href: "/modelos", label: "Modelos" },
  { href: "/cadastros", label: "Cadastros" },
  { href: "/modelos-prontos", label: "Modelos Prontos" },
  { href: "/ajuda", label: "Ajuda" },
];

const adminLinks = [
  { href: "/admin", label: "Painel Admin" },
  { href: "/admin/modelos-prontos", label: "Modelos Prontos (Admin)" },
  { href: "/admin/modelos-prontos/lote", label: "Publicacao em Lote" },
  { href: "/admin/modelos-prontos/categorias", label: "Categorias de Modelos" },
];

export function MobileNav({ canAccessAdmin }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <button
        type="button"
        aria-label="Fechar menu"
        onClick={() => setIsOpen(false)}
        className={cn(
          "fixed inset-0 top-16 z-40 bg-foreground/10 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <div
        className={cn(
          "fixed inset-x-0 top-16 z-50 border-b bg-background/95 backdrop-blur-md transition-all duration-200",
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-2">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded-md px-3 py-2 font-medium hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}

            {canAccessAdmin && (
              <>
                <div className="mt-2 border-t pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Admin
                </div>
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="rounded-md px-3 py-2 font-medium hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <ThemeToggle />
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="default">Entrar</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </div>
  );
}
