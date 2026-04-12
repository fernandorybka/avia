/**
 * Central sanitization and validation utilities for avia!
 *
 * NOTE: Drizzle ORM already uses parameterized queries, so there is no risk
 * of SQL injection from string values. These helpers add extra defense-in-depth
 * by stripping control characters, limiting field lengths and normalizing input.
 */

/** Maximum allowed length for any text field persisted to the database. */
export const MAX_FIELD_LENGTH = 15_000;

/**
 * Sanitizes a generic text value:
 * - Removes null bytes and other ASCII control characters (except common whitespace)
 * - Trims leading/trailing whitespace
 * - Truncates to MAX_FIELD_LENGTH characters
 *
 * Safe for any user-supplied string that will be stored in the DB.
 */
export function sanitizeText(value: string, maxLength = MAX_FIELD_LENGTH): string {
  if (typeof value !== "string") return "";

  return value
    // Remove null bytes and non-printable control chars (keep \t \n \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitizes a record of field values (e.g. generation form values).
 * Each key and value is independently sanitized.
 */
export function sanitizeRecord(
  record: Record<string, string>,
  maxLength = MAX_FIELD_LENGTH
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    // Basic sanitization first
    const cleanKey = sanitizeText(key, 255);
    if (cleanKey) {
      // Normalize to match template placeholders (uppercase, no accents, underscores)
      const normalizedKey = normalizeWildcardKey(cleanKey);
      const canonicalKey = resolveCanonicalWildcardKey(normalizedKey);
      result[canonicalKey] = sanitizeText(value, maxLength);
    }
  }
  return result;
}

/**
 * Sanitizes an array of tag strings:
 * - Applies text sanitization to each tag
 * - Removes empty strings after sanitization
 * - Removes duplicates (case-sensitive)
 * - Limits each tag to 100 characters
 */
export function sanitizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => sanitizeText(t, 100))
    .filter((t) => {
      if (!t || seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

/**
 * Validates a wildcard key (the text between ## delimiters).
 * Allowed: letters (including accented/Unicode), digits, underscores, spaces.
 * Must not be empty or longer than 255 characters.
 */
export function isValidWildcardKey(key: string): boolean {
  if (!key || key.length > 255) return false;
  // \p{L} matches any Unicode letter (includes accented chars and international scripts)
  return /^[\p{L}\p{N}_ ]+$/u.test(key);
}

/**
 * Normalizes a wildcard key to a canonical form:
 * - Removes diacritics/accents (e.g. á → a, ç → c)
 * - Converts to UPPERCASE
 * - Replaces spaces with underscores
 *
 * Examples:
 *   "nome Máximo" → "NOME_MAXIMO"
 *   "Ação"        → "ACAO"
 */
export function normalizeWildcardKey(key: string): string {
  return key
    .normalize("NFD")                    // decompose accented chars
    .replace(/[\u0300-\u036f]/g, "")     // strip combining diacritical marks
    .toUpperCase()
    .replace(/ /g, "_");
}
import { resolveCanonicalWildcardKey } from "@/lib/wildcard-catalog";
