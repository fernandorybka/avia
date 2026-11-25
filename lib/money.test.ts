import assert from "node:assert/strict";
import test from "node:test";

import { centsToInput, formatCents, parseAmountToCents, toCents } from "./money";

test("parseAmountToCents handles Brazilian formats", () => {
  assert.equal(parseAmountToCents("1.234,56"), 123456);
  assert.equal(parseAmountToCents("R$ 1.234,56"), 123456);
  assert.equal(parseAmountToCents("45,5"), 4550);
  assert.equal(parseAmountToCents("60"), 6000);
  assert.equal(parseAmountToCents("1.234"), 123400); // thousands separator, not decimal
  assert.equal(parseAmountToCents("1.234.567"), 123456700);
  assert.equal(parseAmountToCents("12.5"), 1250);
});

test("parseAmountToCents rejects text, negatives and empty input", () => {
  assert.equal(parseAmountToCents(""), null);
  assert.equal(parseAmountToCents(null), null);
  assert.equal(parseAmountToCents("abc"), null);
  assert.equal(parseAmountToCents("-100"), null);
  assert.equal(parseAmountToCents("10 reais"), null);
  assert.equal(parseAmountToCents("1,2,3"), null);
});

test("toCents avoids float drift", () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents(1234.565), 123457);
});

test("formatCents and centsToInput", () => {
  assert.equal(formatCents(123456).replace(/\s/g, " "), "R$ 1.234,56");
  assert.equal(centsToInput(123456), "1.234,56");
});
