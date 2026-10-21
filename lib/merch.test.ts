import assert from "node:assert/strict";
import test from "node:test";

import { dayKey, groupSalesByDay, parsePrice, salesToCsv, sortVariants, type MerchSale } from "./merch";

const sale = (overrides: Partial<MerchSale>): MerchSale => ({
  id: "1",
  variantId: null,
  productName: "Roxo",
  size: "G",
  price: 60,
  soldBy: "Ana",
  createdAt: "2026-10-21T22:00:00.000Z",
  ...overrides,
});

test("sortVariants puts known sizes in order and keeps unknown ones after", () => {
  const sorted = sortVariants([{ size: "XG" }, { size: "Único" }, { size: "p" }, { size: "GG" }, { size: "M" }]);
  assert.deepEqual(
    sorted.map((variant) => variant.size),
    ["p", "M", "GG", "XG", "Único"]
  );
});

test("parsePrice handles Brazilian formats", () => {
  assert.equal(parsePrice("60"), 60);
  assert.equal(parsePrice("45,5"), 45.5);
  assert.equal(parsePrice("R$ 1.234,56"), 1234.56);
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("abc"), null);
});

test("dayKey uses São Paulo time", () => {
  // 01:30 UTC is still the previous evening in São Paulo
  assert.equal(dayKey("2026-10-22T01:30:00.000Z"), "2026-10-21");
  assert.equal(dayKey("2026-10-22T04:00:00.000Z"), "2026-10-22");
});

test("groupSalesByDay groups and sums each night", () => {
  const groups = groupSalesByDay([
    sale({ id: "a", createdAt: "2026-10-22T01:30:00.000Z", price: 50 }),
    sale({ id: "b", createdAt: "2026-10-21T23:00:00.000Z" }),
    sale({ id: "c", createdAt: "2026-10-20T23:00:00.000Z" }),
  ]);

  assert.deepEqual(
    groups.map((group) => [group.day, group.sales.length, group.revenue]),
    [
      ["2026-10-21", 2, 110],
      ["2026-10-20", 1, 60],
    ]
  );
});

test("salesToCsv escapes cells and uses comma decimals", () => {
  const csv = salesToCsv([sale({ productName: 'Camisa "Roxo"', price: 45.5 })]);
  assert.equal(
    csv,
    'Data;Hora;Produto;Tamanho;Valor;Vendido por\n2026-10-21;19:00;"Camisa ""Roxo""";G;45,50;Ana'
  );
});
