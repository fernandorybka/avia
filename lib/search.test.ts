import assert from "node:assert/strict";
import test from "node:test";

import { matchesSearch } from "./search";

const rubrica = "12 - Taxa de Uso de Solo";

test("matches a word in the middle of the text", () => {
  assert.equal(matchesSearch(rubrica, "uso"), true);
  assert.equal(matchesSearch(rubrica, "so"), true); // inside "Uso" and "Solo"
});

test("every typed word must match, in any order", () => {
  assert.equal(matchesSearch(rubrica, "12 solo"), true);
  assert.equal(matchesSearch(rubrica, "solo taxa"), true);
  assert.equal(matchesSearch(rubrica, "taxa luz"), false);
});

test("ignores accents and case", () => {
  assert.equal(matchesSearch("Locação de espaço", "LOCACAO espaco"), true);
  assert.equal(matchesSearch("Locacao de espaco", "locação"), true);
});

test("empty query matches everything", () => {
  assert.equal(matchesSearch(rubrica, ""), true);
  assert.equal(matchesSearch(rubrica, "   "), true);
});
