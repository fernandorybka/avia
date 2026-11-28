"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { navItemClass } from "./nav-styles";

export function AdminNavMenu() {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (!details || !details.open) return;

      const target = event.target as Node | null;
      if (target && !details.contains(target)) {
        details.open = false;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.open = false;
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  return (
    <details ref={detailsRef} className="relative group">
      <summary
        className={`${navItemClass} list-none group-open:bg-primary/10 group-open:text-primary [&::-webkit-details-marker]:hidden`}
      >
        <span className="inline-flex items-center gap-2">
          Admin
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-background shadow-lg p-1">
        <Link href="/admin" onClick={closeMenu} className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary">
          Painel Admin
        </Link>
        <Link
          href="/admin/modelos-prontos"
          onClick={closeMenu}
          className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          Modelos Prontos
        </Link>
        <Link
          href="/admin/modelos-prontos/lote"
          onClick={closeMenu}
          className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          Publicação em Lote
        </Link>
        <Link
          href="/admin/modelos-prontos/categorias"
          onClick={closeMenu}
          className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary"
        >
          Categorias de Modelos
        </Link>
      </div>
    </details>
  );
}
