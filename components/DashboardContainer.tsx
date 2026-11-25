"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DashboardFilter } from "./DashboardFilter";
import { TemplateCard } from "./TemplateCard";
import { UploadTemplate } from "./UploadTemplate";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { TagColorsProvider } from "./TagColors";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { pageWindow } from "@/lib/pagination";

interface Template {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  tags: string[] | null;
}

interface DashboardContainerProps {
  initialTemplates: Template[]; // only the current page
  allAvailableTags: string[];
  selectedTags: string[];
  page: number;
  totalPages: number;
  totalTemplates: number;
  tagColors: Record<string, string>;
}

const LIST_ANCHOR = "lista-modelos";

/** Builds the /modelos URL for a filter + page, leaving out defaults so URLs stay short. */
function modelosHref(pathname: string, tags: string[], page: number, anchor = false) {
  const params = new URLSearchParams();
  tags.forEach((tag) => params.append("etiqueta", tag));
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${anchor ? `#${LIST_ANCHOR}` : ""}`;
}

export function DashboardContainer({
  initialTemplates,
  allAvailableTags,
  selectedTags,
  page,
  totalPages,
  totalTemplates,
  tagColors
}: DashboardContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);

  // Sync state with props when server provides new data (e.g. after revalidation or a page change)
  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  // Changing the filter goes back to page 1, since the old page may not exist anymore
  const navigateToTags = (tags: string[]) => {
    startTransition(() => {
      router.push(modelosHref(pathname, tags, 1), { scroll: false });
    });
  };

  const handleToggleTag = (tag: string) => {
    navigateToTags(
      selectedTags.includes(tag) ? selectedTags.filter((t) => t !== tag) : [...selectedTags, tag]
    );
  };

  const handleClear = () => {
    navigateToTags([]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    // Refill the page with the next model (or fall back a page if this one emptied)
    router.refresh();
  };

  return (
    <TagColorsProvider initialColors={tagColors}>
      <div className="space-y-8">
        <DashboardFilter
          availableTags={allAvailableTags}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
          onClear={handleClear}
        />

        <div
          id={LIST_ANCHOR}
          className={cn(
            "grid sm:grid-cols-2 lg:grid-cols-3 gap-4 scroll-mt-28 transition-opacity",
            isPending && "opacity-60"
          )}
        >
          <UploadTemplate allAvailableTags={allAvailableTags} />
          {templates.length === 0 && selectedTags.length > 0 ? (
            <div className="sm:col-span-1 p-8 text-center space-y-4 border rounded-xl bg-card shadow-sm flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhum modelo com estas etiquetas.</p>
            </div>
          ) : (
            templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={{
                  ...template,
                  tags: template.tags || [] // Ensure tags is string[]
                }}
                allAvailableTags={allAvailableTags}
                onDelete={handleDeleteTemplate}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalTemplates={totalTemplates}
            hrefFor={(p) => modelosHref(pathname, selectedTags, p, true)}
          />
        )}
      </div>
    </TagColorsProvider>
  );
}

function Pagination({
  page,
  totalPages,
  totalTemplates,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  totalTemplates: number;
  hrefFor: (page: number) => string;
}) {
  const linkClass = buttonVariants({ variant: "outline", size: "sm" });
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");

  return (
    <nav aria-label="Paginação dos modelos" className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className={linkClass} aria-label="Página anterior">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden>
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </span>
        )}

        {pageWindow(page, totalPages).map((p, index) =>
          p === null ? (
            <span key={`gap-${index}`} className="px-2 text-sm text-muted-foreground">…</span>
          ) : (
            <Link
              key={p}
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: p === page ? "default" : "ghost", size: "sm" }),
                "min-w-8 tabular-nums"
              )}
            >
              {p}
            </Link>
          )
        )}

        {page < totalPages ? (
          <Link href={hrefFor(page + 1)} className={linkClass} aria-label="Próxima página">
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className={disabledClass} aria-hidden>
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} · {totalTemplates} modelos
      </p>
    </nav>
  );
}
