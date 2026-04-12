import { sanitizeText } from "@/lib/sanitize";

function normalizeForKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeCategoryPath(raw: string): string {
  const sanitized = sanitizeText(raw, 255).replace(/\//g, " > ");
  const segments = sanitized
    .split(">")
    .map((segment) => sanitizeText(segment, 80))
    .filter(Boolean);

  return segments.join(" > ");
}

export function buildCategoryPathKey(path: string): string {
  return normalizeForKey(path)
    .replace(/\s*>\s*/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
