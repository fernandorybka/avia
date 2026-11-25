import { MAX_AMOUNT_CENTS } from "./projects";
import { parseAmountToCents, toCents } from "./money";

/** Pure mapping of spreadsheet rows to budget items. Runs in the browser (preview) and on the server (apply). */

export type SheetCell = string | number | null;

export type SheetData = {
  name: string;
  header: string[];
  rows: SheetCell[][]; // data rows, header excluded
};

export type ColumnMapping = {
  code: number | null;
  name: number;
  amount: number;
};

export type MappedBudgetItem = {
  rowNumber: number; // as shown in Excel (header is row 1)
  code: string | null;
  name: string;
  plannedCents: number;
};

export type MappingError = { rowNumber: number; message: string };

export type MappingResult = {
  items: MappedBudgetItem[];
  errors: MappingError[];
  totalCents: number;
};

export const MAX_NAME_LENGTH = 300;
export const MAX_CODE_LENGTH = 50;

function cellText(cell: SheetCell): string {
  if (cell === null) return "";
  return String(cell).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\s+/g, " ").trim();
}

function cellCents(cell: SheetCell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? toCents(cell) : null;
  return parseAmountToCents(cellText(cell));
}

/** Spreadsheet column letter for a 0-based index: 0 → A, 25 → Z, 26 → AA. */
export function columnLetter(index: number): string {
  let letter = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
}

/** Rows the person unticked in the preview stay out of the project. */
export function selectIncludedItems(items: MappedBudgetItem[], excludedRows: Iterable<number>): MappedBudgetItem[] {
  const excluded = new Set(excludedRows);
  return items.filter((item) => !excluded.has(item.rowNumber));
}

export function isValidMapping(mapping: ColumnMapping, columnCount: number): boolean {
  const columns = [mapping.name, mapping.amount, ...(mapping.code === null ? [] : [mapping.code])];
  return (
    columns.every((column) => Number.isInteger(column) && column >= 0 && column < columnCount) &&
    new Set(columns).size === columns.length
  );
}

/** Guesses columns from header names; anything not found is left for the person to choose. */
export function guessMapping(header: string[]): Partial<ColumnMapping> {
  const normalized = header.map((title) => normalizeKey(title));
  const taken = new Set<number>();
  const find = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = normalized.findIndex((title, i) => !taken.has(i) && pattern.test(title));
      if (index !== -1) {
        taken.add(index);
        return index;
      }
    }
    return undefined;
  };

  const code = find([/^(id|cod|codigo|item|n|no|numero)$/, /^(codigo|identificador)/]) ?? null;
  const name = find([/rubrica/, /descricao/, /^nome/, /^item/]);
  const amount = find([/valor total/, /^total/, /valor/, /previsto/]);
  return { code, name, amount };
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

export function applyMapping(rows: SheetCell[][], mapping: ColumnMapping): MappingResult {
  const items: MappedBudgetItem[] = [];
  const errors: MappingError[] = [];
  const seenCodes = new Map<string, number>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    if (row.every((cell) => cellText(cell) === "")) return;

    const name = cellText(row[mapping.name] ?? null);
    const code = mapping.code === null ? "" : cellText(row[mapping.code] ?? null);
    const amountCell = row[mapping.amount] ?? null;
    const plannedCents = cellCents(amountCell);

    if (!name) {
      errors.push({ rowNumber, message: "Nome da rubrica vazio." });
      return;
    }
    if (name.length > MAX_NAME_LENGTH) {
      errors.push({ rowNumber, message: "Nome da rubrica muito longo." });
      return;
    }
    if (code.length > MAX_CODE_LENGTH) {
      errors.push({ rowNumber, message: "Identificador muito longo." });
      return;
    }
    if (cellText(amountCell) === "") {
      errors.push({ rowNumber, message: "Valor vazio." });
      return;
    }
    if (plannedCents === null) {
      errors.push({ rowNumber, message: "Valor não é um número." });
      return;
    }
    if (plannedCents <= 0) {
      errors.push({ rowNumber, message: "Valor precisa ser maior que zero." });
      return;
    }
    if (plannedCents > MAX_AMOUNT_CENTS) {
      errors.push({ rowNumber, message: "Valor alto demais." });
      return;
    }
    if (code) {
      const codeKey = normalizeKey(code);
      const firstRow = seenCodes.get(codeKey);
      if (firstRow !== undefined) {
        errors.push({ rowNumber, message: `Identificador repetido (já usado na linha ${firstRow}).` });
        return;
      }
      seenCodes.set(codeKey, rowNumber);
    }

    items.push({ rowNumber, code: code || null, name, plannedCents });
  });

  return { items, errors, totalCents: items.reduce((sum, item) => sum + item.plannedCents, 0) };
}
