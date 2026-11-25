import assert from "node:assert/strict";
import test from "node:test";
import PizZip from "pizzip";

import { BudgetSheetError, readBudgetWorkbook, validateXlsxContainer } from "./budget-sheet";

type Cell = string | number | { formula: string; cached?: number } | null;

function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal valid .xlsx (inline strings) so tests don't depend on binary fixtures. */
function buildXlsx(sheets: { name: string; rows: Cell[][] }[], extraFiles: Record<string, string> = {}): Buffer {
  const zip = new PizZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
      .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join("")}</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
      .map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("")}</Relationships>`
  );
  sheets.forEach((sheet, i) => {
    const rows = sheet.rows
      .map((row, r) => {
        const cells = row
          .map((cell, c) => {
            const ref = `${columnName(c)}${r + 1}`;
            if (cell === null) return "";
            if (typeof cell === "number") return `<c r="${ref}"><v>${cell}</v></c>`;
            if (typeof cell === "object") {
              return `<c r="${ref}"><f>${escapeXml(cell.formula)}</f>${cell.cached === undefined ? "" : `<v>${cell.cached}</v>`}</c>`;
            }
            return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
          })
          .join("");
        return `<row r="${r + 1}">${cells}</row>`;
      })
      .join("");
    zip.file(
      `xl/worksheets/sheet${i + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`
    );
  });
  for (const [path, content] of Object.entries(extraFiles)) zip.file(path, content);
  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
}

test("reads a simple budget with header, numbers, text amounts and cached formulas", async () => {
  const buffer = buildXlsx([
    {
      name: "Orçamento",
      rows: [
        ["Item", "Rubrica", "Valor"],
        ["1.1", "Cachê", 12000],
        ["1.2", "Figurino", "3.500,50"],
        ["1.3", "Total parcial", { formula: "C2+1", cached: 12001 }],
        ["1.4", "Sem cache", { formula: "C2+1" }],
      ],
    },
  ]);

  const [sheet] = await readBudgetWorkbook(buffer);
  assert.equal(sheet.name, "Orçamento");
  assert.deepEqual(sheet.header, ["Item", "Rubrica", "Valor"]);
  assert.deepEqual(sheet.rows[0], ["1.1", "Cachê", 12000]);
  assert.deepEqual(sheet.rows[1], ["1.2", "Figurino", "3.500,50"]);
  assert.equal(sheet.rows[2][2], 12001); // cached value, formula not evaluated
  assert.equal(sheet.rows[3][2], null); // formula without cached value → empty, flagged by the mapping
});

test("returns every sheet and names blank header cells", async () => {
  const sheets = await readBudgetWorkbook(
    buildXlsx([
      { name: "Capa", rows: [["Projeto X"]] },
      { name: "Orçamento", rows: [["Rubrica", null, "Valor"], ["Som", null, 10]] },
    ])
  );
  assert.deepEqual(sheets.map((sheet) => sheet.name), ["Capa", "Orçamento"]);
  assert.deepEqual(sheets[1].header, ["Rubrica", "Coluna B", "Valor"]);
});

test("rejects files that are not xlsx", () => {
  assert.throws(() => validateXlsxContainer(Buffer.from("col1;col2\n1;2")), BudgetSheetError);
  assert.throws(() => validateXlsxContainer(Buffer.alloc(0)), BudgetSheetError);
  // Old .xls (OLE2 compound file)
  assert.throws(() => validateXlsxContainer(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])), BudgetSheetError);
});

test("rejects a zip that is not a workbook", () => {
  const zip = new PizZip();
  zip.file("hello.txt", "oi");
  assert.throws(() => validateXlsxContainer(zip.generate({ type: "nodebuffer" })), /não é uma planilha/);
});

test("rejects workbooks with macros (.xlsm renamed)", () => {
  const buffer = buildXlsx([{ name: "A", rows: [["x"]] }], { "xl/vbaProject.bin": "macro" });
  assert.throws(() => validateXlsxContainer(buffer), /macros/);
});

test("rejects zip bombs by declared uncompressed size", () => {
  const buffer = buildXlsx([{ name: "A", rows: [["x"]] }], { "xl/media/bomb.xml": "0".repeat(26 * 1024 * 1024) });
  assert.ok(buffer.length < 2 * 1024 * 1024, "compressed bomb is small");
  assert.throws(() => validateXlsxContainer(buffer), /grande demais/);
});

test("rejects files over 2 MB", () => {
  const big = Buffer.alloc(2 * 1024 * 1024 + 1);
  big.writeUInt32LE(0x04034b50, 0);
  assert.throws(() => validateXlsxContainer(big), /2 MB/);
});

test("rejects too many columns", async () => {
  const wide = Array.from({ length: 51 }, (_, i) => `C${i}`);
  await assert.rejects(readBudgetWorkbook(buildXlsx([{ name: "A", rows: [wide] }])), /colunas/);
});
