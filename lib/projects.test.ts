import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceAfterPayment,
  budgetItemProgress,
  checklistStatus,
  DEFAULT_PAYMENT_TYPES,
  filterPayments,
  formatBudgetItemLabel,
  groupPaymentsByMonth,
  paymentInputSchema,
  summarizeBudget,
} from "./projects";

test("default types cover the five kinds and Devolução requires the letter", () => {
  assert.equal(DEFAULT_PAYMENT_TYPES.length, 5);
  const devolucao = DEFAULT_PAYMENT_TYPES.find((type) => type.name === "Devolução");
  assert.ok(devolucao);
  assert.equal(devolucao.budgetItemOptional, true);
  assert.deepEqual(devolucao.items[0], { label: "Carta de devolução", allowNotApplicable: false });
  assert.equal(new Set(DEFAULT_PAYMENT_TYPES.map((type) => type.name)).size, 5);
});

test("checklistStatus counts done and allowed N/A, ignores archived items", () => {
  const items = [
    { id: "a", allowNotApplicable: false, archived: false },
    { id: "b", allowNotApplicable: true, archived: false },
    { id: "c", allowNotApplicable: false, archived: true },
  ];
  assert.deepEqual(checklistStatus(items, {}), { total: 2, resolved: 0, pending: 2, complete: false });
  assert.deepEqual(checklistStatus(items, { a: "done", b: "na" }), { total: 2, resolved: 2, pending: 0, complete: true });
});

test("checklistStatus treats N/A on an item that no longer allows it as pending", () => {
  const items = [{ id: "a", allowNotApplicable: false, archived: false }];
  assert.equal(checklistStatus(items, { a: "na" }).complete, false);
});

test("checklistStatus: a type without active items is complete", () => {
  assert.equal(checklistStatus([], {}).complete, true);
});

test("formatBudgetItemLabel", () => {
  assert.equal(formatBudgetItemLabel("1.2", "Cachê"), "1.2 - Cachê");
  assert.equal(formatBudgetItemLabel(null, "Cachê"), "Cachê");
  assert.equal(formatBudgetItemLabel("  ", "Cachê"), "Cachê");
});

test("summarizeBudget with several payments and overspending", () => {
  assert.deepEqual(summarizeBudget(10000, [3000, 2000]), {
    plannedCents: 10000,
    paidCents: 5000,
    balanceCents: 5000,
    overspent: false,
    progress: 0.5,
  });
  const over = summarizeBudget(10000, [8000, 4000]);
  assert.equal(over.balanceCents, -2000);
  assert.equal(over.overspent, true);
  assert.equal(over.progress, 1);
  assert.equal(summarizeBudget(0, [100]).progress, 1);
  assert.equal(summarizeBudget(0, []).progress, 0);
});

test("balanceAfterPayment gives back the edited payment's old amount", () => {
  assert.equal(balanceAfterPayment({ plannedCents: 10000, paidCents: 6000, amountCents: 5000 }), -1000);
  assert.equal(balanceAfterPayment({ plannedCents: 10000, paidCents: 6000, amountCents: 5000, previousAmountCents: 2000 }), 1000);
});

test("paymentInputSchema validates fields", () => {
  const valid = {
    paymentTypeId: "6f1e7d8c-3b2a-4c5d-8e9f-0a1b2c3d4e5f",
    budgetItemId: null,
    paymentDate: "2026-11-25",
    amountCents: 1000,
    payee: " Ana ",
    comment: "",
    confirmOverBudget: false,
  };
  const parsed = paymentInputSchema.parse(valid);
  assert.equal(parsed.payee, "Ana");
  assert.equal(paymentInputSchema.safeParse({ ...valid, paymentDate: "2026-02-30" }).success, false);
  assert.equal(paymentInputSchema.safeParse({ ...valid, amountCents: 0 }).success, false);
  assert.equal(paymentInputSchema.safeParse({ ...valid, amountCents: 10.5 }).success, false);
  assert.equal(paymentInputSchema.safeParse({ ...valid, payee: "  " }).success, false);
  assert.equal(paymentInputSchema.safeParse({ ...valid, paymentTypeId: "x" }).success, false);
});

const payment = (overrides: Partial<{ budgetItemId: string | null; paymentTypeId: string; docsComplete: boolean; paymentDate: string; createdAt: string }>) => ({
  budgetItemId: "item-1",
  paymentTypeId: "pf",
  docsComplete: true,
  paymentDate: "2026-10-01",
  createdAt: "2026-10-01T10:00:00.000Z",
  ...overrides,
});

test("filterPayments by budget item, type and docs", () => {
  const list = [
    payment({}),
    payment({ budgetItemId: "item-2", docsComplete: false }),
    payment({ budgetItemId: null, paymentTypeId: "devolucao" }),
  ];
  assert.equal(filterPayments(list, {}).length, 3);
  assert.equal(filterPayments(list, { budgetItemId: "item-2" }).length, 1);
  assert.equal(filterPayments(list, { budgetItemId: "none" }).length, 1);
  assert.equal(filterPayments(list, { paymentTypeId: "devolucao" }).length, 1);
  assert.equal(filterPayments(list, { docs: "pending" }).length, 1);
  assert.equal(filterPayments(list, { docs: "complete" }).length, 2);
});

test("groupPaymentsByMonth sorts newest first", () => {
  const groups = groupPaymentsByMonth([
    payment({ paymentDate: "2026-09-15" }),
    payment({ paymentDate: "2026-10-02", createdAt: "2026-10-02T09:00:00.000Z" }),
    payment({ paymentDate: "2026-10-02", createdAt: "2026-10-02T11:00:00.000Z" }),
  ]);
  assert.deepEqual(groups.map((group) => group.month), ["2026-10", "2026-09"]);
  assert.equal(groups[0].payments[0].createdAt, "2026-10-02T11:00:00.000Z");
});

test("groupPaymentsByMonth can sort oldest first", () => {
  const groups = groupPaymentsByMonth(
    [
      payment({ paymentDate: "2026-10-02", createdAt: "2026-10-02T11:00:00.000Z" }),
      payment({ paymentDate: "2026-09-15" }),
      payment({ paymentDate: "2026-10-02", createdAt: "2026-10-02T09:00:00.000Z" }),
    ],
    "asc"
  );
  assert.deepEqual(groups.map((group) => group.month), ["2026-09", "2026-10"]);
  assert.equal(groups[1].payments[0].createdAt, "2026-10-02T09:00:00.000Z");
});

test("budgetItemProgress classifies budget items", () => {
  const item = (status: "active" | "out_of_budget", plannedCents: number, paidCents: number) => ({
    status,
    paidCents,
    balanceCents: plannedCents - paidCents,
  });
  assert.equal(budgetItemProgress(item("active", 1000, 0)), "sem_pagamentos");
  assert.equal(budgetItemProgress(item("active", 1000, 400)), "em_execucao");
  assert.equal(budgetItemProgress(item("active", 1000, 1000)), "concluida");
  assert.equal(budgetItemProgress(item("active", 1000, 1200)), "estourada");
  assert.equal(budgetItemProgress(item("out_of_budget", 0, 500)), "fora_do_orcamento");
});
