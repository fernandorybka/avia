import readXlsxFile from "read-excel-file/node";
import { columnLetter, type SheetCell, type SheetData } from "./budget-mapping";

/**
 * Server-side reading of budget spreadsheets. Everything here runs before any value
 * is trusted: container checks first (size, zip bomb, macros), then cell limits.
 * Formulas are never evaluated — read-excel-file returns the value Excel cached.
 */

export const MAX_BUDGET_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
export const MAX_ZIP_ENTRIES = 200;
export const MAX_ROWS = 5000;
export const MAX_COLUMNS = 50;
export const MAX_CELL_LENGTH = 500;

/** Message is safe to show to the person (never contains cell values). */
export class BudgetSheetError extends Error {}

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_ENTRY_SIGNATURE = 0x02014b50;

/** Reads the zip central directory without inflating anything. */
export function validateXlsxContainer(buffer: Buffer): void {
  if (buffer.length === 0) throw new BudgetSheetError("O arquivo está vazio.");
  if (buffer.length > MAX_BUDGET_FILE_BYTES) throw new BudgetSheetError("A planilha pode ter no máximo 2 MB.");
  if (buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new BudgetSheetError("O arquivo não é uma planilha .xlsx válida. Se for .xls ou .ods, salve como .xlsx.");
  }

  // End of central directory: last 22 bytes + up to 64 KB of comment
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 22 - 0xffff); offset--) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) {
      eocd = offset;
      break;
    }
  }
  if (eocd === -1) throw new BudgetSheetError("O arquivo .xlsx está corrompido.");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const directoryOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    throw new BudgetSheetError("Planilha grande demais.");
  }
  if (entryCount > MAX_ZIP_ENTRIES) throw new BudgetSheetError("A planilha tem partes internas demais.");

  let offset = directoryOffset;
  let totalUncompressed = 0;
  let hasWorkbook = false;

  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_ENTRY_SIGNATURE) {
      throw new BudgetSheetError("O arquivo .xlsx está corrompido.");
    }
    const uncompressed = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8").toLowerCase();

    if (uncompressed === 0xffffffff) throw new BudgetSheetError("Planilha grande demais.");
    totalUncompressed += uncompressed;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new BudgetSheetError("Planilha grande demais.");
    if (name.endsWith("vbaproject.bin")) {
      throw new BudgetSheetError("Planilhas com macros não são aceitas. Salve como .xlsx comum.");
    }
    if (name === "xl/workbook.xml") hasWorkbook = true;

    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (!hasWorkbook) {
    throw new BudgetSheetError("O arquivo não é uma planilha .xlsx válida. Se for .xls ou .ods, salve como .xlsx.");
  }
}

function toSheetCell(value: unknown): SheetCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const text = String(value);
  if (text.length > MAX_CELL_LENGTH) throw new BudgetSheetError("A planilha tem células com texto longo demais.");
  return text;
}

function trimTrailingEmpty(row: SheetCell[]): SheetCell[] {
  let end = row.length;
  while (end > 0 && (row[end - 1] === null || row[end - 1] === "")) end--;
  return row.slice(0, end);
}

/** Every sheet with its first row as header. Sheets without any data are left out. */
export async function readBudgetWorkbook(buffer: Buffer): Promise<SheetData[]> {
  validateXlsxContainer(buffer);

  let sheets: Awaited<ReturnType<typeof readXlsxFile>>;
  try {
    sheets = await readXlsxFile(buffer);
  } catch {
    throw new BudgetSheetError("Não foi possível ler a planilha. Confira se o arquivo é um .xlsx válido.");
  }

  const result: SheetData[] = [];
  for (const sheet of sheets) {
    if (sheet.data.length > MAX_ROWS + 1) throw new BudgetSheetError(`A planilha pode ter no máximo ${MAX_ROWS} linhas.`);

    const rows = sheet.data.map((row) => trimTrailingEmpty(row.map(toSheetCell)));
    const width = Math.max(0, ...rows.map((row) => row.length));
    if (width > MAX_COLUMNS) throw new BudgetSheetError(`A planilha pode ter no máximo ${MAX_COLUMNS} colunas.`);

    const [headerRow = [], ...dataRows] = rows;
    if (width === 0) continue;

    const header = Array.from({ length: width }, (_, index) => {
      const title = headerRow[index];
      return title === null || title === undefined || title === "" ? `Coluna ${columnLetter(index)}` : String(title).trim();
    });

    result.push({
      name: sheet.sheet.slice(0, 100),
      header,
      rows: dataRows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? null)),
    });
  }

  if (result.length === 0) throw new BudgetSheetError("A planilha está vazia.");
  return result;
}
