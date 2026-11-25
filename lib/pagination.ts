// 8 models + the "Novo Modelo" card, which shows on every page = 3 full rows of 3
export const TEMPLATES_PER_PAGE = 8;

export type Page<T> = {
  items: T[];
  page: number; // 1-based, clamped to the existing pages
  totalPages: number; // at least 1, even with no items
  totalItems: number;
};

/** Reads a 1-based page number from a search param; anything invalid becomes page 1. */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? page : 1;
}

/** Normalizes a repeated search param (?etiqueta=a&etiqueta=b) into a list without blanks or repeats. */
export function parseListParam(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

/** Slices one page out of `items`; a page past the end shows the last page instead. */
export function paginate<T>(items: T[], page: number, perPage: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;

  return {
    items: items.slice(start, start + perPage),
    page: current,
    totalPages,
    totalItems: items.length,
  };
}

/**
 * Page numbers to show in a pager, with null where a run of pages is collapsed:
 * 1 … 4 5 6 … 12
 */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  for (const p of sorted) {
    const last = result[result.length - 1];
    if (typeof last === "number" && p - last > 1) {
      // A gap of exactly one page shows the page itself instead of "…"
      result.push(p - last === 2 ? last + 1 : null);
    }
    result.push(p);
  }
  return result;
}
