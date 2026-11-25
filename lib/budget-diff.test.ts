import assert from "node:assert/strict";
import test from "node:test";

import { linksByRowToIndexes, matchBudgetItems, type CurrentBudgetItem } from "./budget-diff";

const item = (overrides: Partial<CurrentBudgetItem> & { id: string; name: string }): CurrentBudgetItem => ({
  code: null,
  plannedCents: 10000,
  paidCents: 0,
  paymentCount: 0,
  status: "active",
  ...overrides,
});

test("same identifier with a new value is a change", () => {
  const diff = matchBudgetItems(
    [item({ id: "a", code: "1.1", name: "Cachê" })],
    [{ code: "1.1", name: "Cachê", plannedCents: 15000 }],
    { matchByCode: true }
  );
  assert.equal(diff.matched.length, 1);
  assert.equal(diff.matched[0].current.id, "a");
  assert.equal(diff.matched[0].changed, true);
  assert.deepEqual(diff.added, []);
});

test("without identifiers items match by normalized name", () => {
  const diff = matchBudgetItems(
    [item({ id: "a", name: "Cachê Elenco" })],
    [{ code: null, name: "  cache   elenco ", plannedCents: 10000 }],
    { matchByCode: false }
  );
  assert.equal(diff.matched[0].current.id, "a");
});

test("renamed item: manual link wins, otherwise remove + add", () => {
  const current = [item({ id: "a", name: "Som" })];
  const incoming = [{ code: null, name: "Sonorização", plannedCents: 10000 }];

  const automatic = matchBudgetItems(current, incoming, { matchByCode: false });
  assert.deepEqual(automatic.added, [0]);
  assert.equal(automatic.removedEmpty[0].id, "a");

  const linked = matchBudgetItems(current, incoming, { matchByCode: false, manualLinks: { 0: "a" } });
  assert.equal(linked.matched[0].current.id, "a");
  assert.deepEqual(linked.added, []);
  assert.deepEqual(linked.removedEmpty, []);
});

test("manual links to unknown or removed items are ignored", () => {
  const diff = matchBudgetItems(
    [item({ id: "gone", name: "Antigo", status: "removed" })],
    [{ code: null, name: "Novo", plannedCents: 1 }],
    { matchByCode: false, manualLinks: { 0: "gone", 5: "x" } }
  );
  assert.deepEqual(diff.added, [0]);
});

test("removed items split by whether they have payments", () => {
  const diff = matchBudgetItems(
    [item({ id: "a", name: "Sem pagamento" }), item({ id: "b", name: "Com pagamento", paidCents: 500, paymentCount: 1 })],
    [{ code: null, name: "Outra", plannedCents: 100 }],
    { matchByCode: false }
  );
  assert.deepEqual(diff.removedEmpty.map((entry) => entry.id), ["a"]);
  assert.deepEqual(diff.removedWithPayments.map((entry) => entry.id), ["b"]);
});

test("planned below what's been paid is overspent", () => {
  const diff = matchBudgetItems(
    [item({ id: "a", name: "Luz", paidCents: 8000, paymentCount: 2 })],
    [{ code: null, name: "Luz", plannedCents: 5000 }],
    { matchByCode: false }
  );
  assert.equal(diff.matched[0].overspent, true);
});

test("an out-of-budget item that comes back is reactivated, and one still missing isn't removed again", () => {
  const out = item({ id: "a", name: "Luz", plannedCents: 0, paidCents: 100, paymentCount: 1, status: "out_of_budget" });
  const back = matchBudgetItems([out], [{ code: null, name: "Luz", plannedCents: 100 }], { matchByCode: false });
  assert.equal(back.matched[0].changed, true);

  const stillOut = matchBudgetItems([out], [{ code: null, name: "Som", plannedCents: 100 }], { matchByCode: false });
  assert.deepEqual(stillOut.removedWithPayments, []);
});

test("each current item matches at most once", () => {
  const diff = matchBudgetItems(
    [item({ id: "a", name: "Luz" })],
    [
      { code: null, name: "Luz", plannedCents: 1 },
      { code: null, name: "Luz", plannedCents: 2 },
    ],
    { matchByCode: false }
  );
  assert.equal(diff.matched.length, 1);
  assert.deepEqual(diff.added, [1]);
});

test("linksByRowToIndexes follows the rows that are still included", () => {
  const included = [{ rowNumber: 2 }, { rowNumber: 5 }, { rowNumber: 6 }];
  assert.deepEqual(linksByRowToIndexes(included, { 5: "a", 3: "gone" }), { 1: "a" });
});
