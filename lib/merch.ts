export const MERCH_TIMEZONE = "America/Sao_Paulo";
export const DEFAULT_MERCH_COLOR = "#a8a29e";

const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG"];

export type MerchVariant = {
  id: string;
  size: string;
  quantity: number;
};

export type MerchProduct = {
  id: string;
  name: string;
  color: string;
  price: number;
  variants: MerchVariant[];
};

export type MerchSale = {
  id: string;
  variantId: string | null;
  productName: string;
  size: string;
  price: number;
  soldBy: string;
  createdAt: string; // ISO
};

export type MerchToday = {
  count: number;
  revenue: number;
};

function sizeRank(size: string): number {
  const index = SIZE_ORDER.indexOf(size.trim().toUpperCase());
  return index === -1 ? SIZE_ORDER.length : index;
}

/** Known clothing sizes first (P, M, G...), anything else keeps its original order after them. */
export function sortVariants<T extends { size: string }>(variants: T[]): T[] {
  return variants
    .map((variant, index) => ({ variant, index }))
    .sort((a, b) => sizeRank(a.variant.size) - sizeRank(b.variant.size) || a.index - b.index)
    .map(({ variant }) => variant);
}

export function totalAvailable(products: MerchProduct[]): number {
  return products.reduce(
    (sum, product) => sum + product.variants.reduce((acc, variant) => acc + variant.quantity, 0),
    0
  );
}

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

/** Calendar day (YYYY-MM-DD) in São Paulo time, used to group sales by night. */
export function dayKey(date: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MERCH_TIMEZONE }).format(new Date(date));
}

export function formatDay(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    timeZone: MERCH_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function groupSalesByDay(sales: MerchSale[]): { day: string; sales: MerchSale[]; revenue: number }[] {
  const groups = new Map<string, MerchSale[]>();
  for (const sale of sales) {
    const key = dayKey(sale.createdAt);
    groups.set(key, [...(groups.get(key) ?? []), sale]);
  }

  return Array.from(groups, ([day, items]) => ({
    day,
    sales: items,
    revenue: items.reduce((sum, sale) => sum + sale.price, 0),
  }));
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Semicolon-separated so Excel/Sheets in pt-BR open it in columns. */
export function salesToCsv(sales: MerchSale[]): string {
  const header = ["Data", "Hora", "Produto", "Tamanho", "Valor", "Vendido por"];
  const rows = sales.map((sale) => [
    dayKey(sale.createdAt),
    formatTime(sale.createdAt),
    sale.productName,
    sale.size,
    sale.price.toFixed(2).replace(".", ","),
    sale.soldBy,
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
}
