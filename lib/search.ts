/** Lowercase without accents, so "Locação" and "locacao" compare equal. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Every word typed must appear somewhere in the text, in any order and even mid-word:
 * "uso" and "12 solo" both match "12 - Taxa de Uso de Solo".
 */
export function matchesSearch(text: string, query: string): boolean {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalizeSearchText(text);
  return terms.every((term) => haystack.includes(term));
}
