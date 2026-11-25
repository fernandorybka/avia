/**
 * Parses a price typed by a person ("60", "45,5", "R$ 1.234,56").
 * Returns null for empty or invalid input.
 */
export function parsePrice(input: string | null | undefined): number | null {
  if (!input) return null;
  let cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function formatCents(cents: number): string {
  return formatPrice(cents / 100);
}

/** Cents as the "1.234,56" text people type back into an amount field. */
export function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Amount written as text, in cents. Stricter than parsePrice: a lone dot followed by
 * exactly three digits ("1.234") is a pt-BR thousands separator, not a decimal point,
 * and anything with letters or a minus sign is rejected instead of silently stripped.
 */
export function parseAmountToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const text = input.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text || !/^[\d.,]+$/.test(text)) return null;

  let normalized: string;
  if (text.includes(",")) {
    normalized = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    normalized = text.replace(/\./g, "");
  } else {
    normalized = text;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? toCents(value) : null;
}
