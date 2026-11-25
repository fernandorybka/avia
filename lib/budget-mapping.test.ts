import assert from "node:assert/strict";
import test from "node:test";

import { applyMapping, columnLetter, guessMapping, isValidMapping, selectIncludedItems } from "./budget-mapping";

test("applyMapping reads numbers and pt-BR text, skips empty rows", () => {
  const result = applyMapping(
    [
      ["1.1", "Cachê elenco", 12000],
      [null, null, null],
      ["1.2", "Figurino", "R$ 3.500,50"],
    ],
    { code: 0, name: 1, amount: 2 }
  );

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.items, [
    { rowNumber: 2, code: "1.1", name: "Cachê elenco", plannedCents: 1200000 },
    { rowNumber: 4, code: "1.2", name: "Figurino", plannedCents: 350050 },
  ]);
  assert.equal(result.totalCents, 1550050);
});

test("applyMapping works without an identifier column", () => {
  const result = applyMapping([["Divulgação", 500]], { code: null, name: 0, amount: 1 });
  assert.deepEqual(result.items, [{ rowNumber: 2, code: null, name: "Divulgação", plannedCents: 50000 }]);
});

test("applyMapping reports row errors without echoing values", () => {
  const result = applyMapping(
    [
      ["1", "", 100],
      ["2", "Som", ""],
      ["3", "Luz", "muito"],
      ["4", "Palco", -10],
      ["1", "Repetido", 10],
    ],
    { code: 0, name: 1, amount: 2 }
  );

  // Row 2 had an error, so code "1" was never registered and row 6 is valid
  assert.deepEqual(result.items.map((entry) => entry.rowNumber), [6]);
  assert.deepEqual(
    result.errors.map((error) => [error.rowNumber, error.message]),
    [
      [2, "Nome da rubrica vazio."],
      [3, "Valor vazio."],
      [4, "Valor não é um número."],
      [5, "Valor precisa ser maior que zero."],
    ]
  );
});

test("applyMapping flags duplicate identifiers", () => {
  const result = applyMapping(
    [
      ["1.1", "A", 10],
      ["1.1 ", "B", 10],
    ],
    { code: 0, name: 1, amount: 2 }
  );
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.errors, [{ rowNumber: 3, message: "Identificador repetido (já usado na linha 2)." }]);
});

test("applyMapping strips control characters", () => {
  const result = applyMapping([["Luz\u0000  e som", 10]], { code: null, name: 0, amount: 1 });
  assert.equal(result.items[0].name, "Luz e som");
});

test("isValidMapping rejects repeated or out-of-range columns", () => {
  assert.equal(isValidMapping({ code: null, name: 0, amount: 1 }, 2), true);
  assert.equal(isValidMapping({ code: 0, name: 0, amount: 1 }, 2), false);
  assert.equal(isValidMapping({ code: null, name: 0, amount: 2 }, 2), false);
  assert.equal(isValidMapping({ code: null, name: -1, amount: 1 }, 2), false);
});

test("guessMapping finds common header names", () => {
  assert.deepEqual(guessMapping(["Item", "Descrição", "Valor Total"]), { code: 0, name: 1, amount: 2 });
  assert.deepEqual(guessMapping(["Rubrica", "Valor"]), { code: null, name: 0, amount: 1 });
});

test("columnLetter follows spreadsheet naming", () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52].map(columnLetter), ["A", "B", "Z", "AA", "AB", "AZ", "BA"]);
});

test("selectIncludedItems drops unticked rows", () => {
  const { items } = applyMapping([["Som", 10], ["Luz", 20], ["Palco", 30]], { code: null, name: 0, amount: 1 });
  assert.deepEqual(selectIncludedItems(items, [3]).map((item) => item.name), ["Som", "Palco"]);
  assert.equal(selectIncludedItems(items, []).length, 3);
});
