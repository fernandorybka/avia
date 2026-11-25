import * as z from "zod";

export const PROJECT_TIMEZONE = "America/Sao_Paulo";

/* ---------- Payment types and checklists ---------- */

export type ChecklistState = "done" | "na";

export type PaymentTypeDefinition = {
  name: string;
  budgetItemOptional: boolean;
  items: { label: string; allowNotApplicable: boolean }[];
};

/** Created for each person the first time they open the module; all editable afterwards. */
export const DEFAULT_PAYMENT_TYPES: PaymentTypeDefinition[] = [
  {
    name: "Pessoa física (PF)",
    budgetItemOptional: false,
    items: [
      { label: "Recibo/RPA assinado", allowNotApplicable: false },
      { label: "Comprovante de pagamento", allowNotApplicable: false },
      { label: "Documento de identificação e CPF", allowNotApplicable: false },
      { label: "Guia de retenção (INSS/IRRF/ISS)", allowNotApplicable: true },
    ],
  },
  {
    name: "Pessoa jurídica (PJ)",
    budgetItemOptional: false,
    items: [
      { label: "Nota fiscal", allowNotApplicable: false },
      { label: "Comprovante de pagamento", allowNotApplicable: false },
      { label: "Orçamento ou contrato", allowNotApplicable: true },
    ],
  },
  {
    name: "Compra",
    budgetItemOptional: false,
    items: [
      { label: "Nota fiscal ou cupom", allowNotApplicable: false },
      { label: "Comprovante de pagamento", allowNotApplicable: false },
      { label: "Cotações", allowNotApplicable: true },
    ],
  },
  {
    name: "DARF",
    budgetItemOptional: false,
    items: [
      { label: "Guia DARF", allowNotApplicable: false },
      { label: "Comprovante de pagamento", allowNotApplicable: false },
    ],
  },
  {
    name: "Devolução",
    budgetItemOptional: true,
    items: [
      { label: "Carta de devolução", allowNotApplicable: false },
      { label: "Comprovante de depósito/transferência", allowNotApplicable: false },
    ],
  },
];

export type ChecklistItem = {
  id: string;
  label: string;
  allowNotApplicable: boolean;
  archived: boolean;
};

export type ChecklistStatus = {
  total: number;
  resolved: number;
  pending: number;
  complete: boolean;
};

/**
 * Archived items don't count. A missing state is pending, and an "na" on an item
 * that no longer allows it is pending too (the rule changed after it was marked).
 */
export function checklistStatus(
  items: Pick<ChecklistItem, "id" | "allowNotApplicable" | "archived">[],
  states: Record<string, ChecklistState | undefined>
): ChecklistStatus {
  const active = items.filter((item) => !item.archived);
  const resolved = active.filter((item) => {
    const state = states[item.id];
    return state === "done" || (state === "na" && item.allowNotApplicable);
  }).length;

  return { total: active.length, resolved, pending: active.length - resolved, complete: resolved === active.length };
}

/* ---------- Budget items ---------- */

export type BudgetItemStatus = "active" | "out_of_budget" | "removed";

export function formatBudgetItemLabel(code: string | null | undefined, name: string): string {
  const cleanCode = code?.trim();
  return cleanCode ? `${cleanCode} - ${name}` : name;
}

export type BudgetItemSummary = {
  plannedCents: number;
  paidCents: number;
  balanceCents: number;
  overspent: boolean;
  /** 0–1, capped at 1 for the progress bar */
  progress: number;
};

export function summarizeBudget(plannedCents: number, paymentCents: number[]): BudgetItemSummary {
  const paidCents = paymentCents.reduce((sum, value) => sum + value, 0);
  const balanceCents = plannedCents - paidCents;
  return {
    plannedCents,
    paidCents,
    balanceCents,
    overspent: balanceCents < 0,
    progress: plannedCents > 0 ? Math.min(paidCents / plannedCents, 1) : paidCents > 0 ? 1 : 0,
  };
}

export type BudgetItemProgress = "sem_pagamentos" | "em_execucao" | "concluida" | "estourada" | "fora_do_orcamento";

export const BUDGET_ITEM_PROGRESS_LABELS: Record<BudgetItemProgress, string> = {
  sem_pagamentos: "Sem pagamentos",
  em_execucao: "Em execução",
  concluida: "Concluídas",
  estourada: "Estouradas",
  fora_do_orcamento: "Fora do orçamento",
};

/** Where a budget item stands, for filtering: out of budget wins, then overspent, then by what's been paid. */
export function budgetItemProgress(item: {
  status: BudgetItemStatus;
  paidCents: number;
  balanceCents: number;
}): BudgetItemProgress {
  if (item.status === "out_of_budget") return "fora_do_orcamento";
  if (item.balanceCents < 0) return "estourada";
  if (item.paidCents === 0) return "sem_pagamentos";
  if (item.balanceCents === 0) return "concluida";
  return "em_execucao";
}

/** Balance left in a budget item if this payment is saved (the edited payment's old amount is given back first). */
export function balanceAfterPayment(params: {
  plannedCents: number;
  paidCents: number;
  amountCents: number;
  previousAmountCents?: number;
}): number {
  const { plannedCents, paidCents, amountCents, previousAmountCents = 0 } = params;
  return plannedCents - (paidCents - previousAmountCents + amountCents);
}

/* ---------- Payments ---------- */

export const MAX_AMOUNT_CENTS = 100_000_000_000; // R$ 1 bilhão

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Data inválida.");

/** What the server accepts for a payment (amount already in cents). */
export const paymentInputSchema = z.object({
  paymentTypeId: z.uuid("Escolha o tipo."),
  budgetItemId: z.uuid().nullable(),
  paymentDate: isoDate,
  amountCents: z.number().int().positive("O valor precisa ser maior que zero.").max(MAX_AMOUNT_CENTS, "Valor alto demais."),
  payee: z.string().trim().min(1, "Informe o favorecido.").max(200, "Favorecido muito longo."),
  comment: z.string().trim().max(2000, "Comentário muito longo."),
  confirmOverBudget: z.boolean(),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;

export type PaymentFilters = {
  budgetItemId?: string | null; // "none" = payments without a budget item
  paymentTypeId?: string | null;
  docs?: "complete" | "pending" | null;
};

export function filterPayments<T extends { budgetItemId: string | null; paymentTypeId: string; docsComplete: boolean }>(
  payments: T[],
  filters: PaymentFilters
): T[] {
  return payments.filter((payment) => {
    if (filters.budgetItemId === "none" && payment.budgetItemId !== null) return false;
    if (filters.budgetItemId && filters.budgetItemId !== "none" && payment.budgetItemId !== filters.budgetItemId) {
      return false;
    }
    if (filters.paymentTypeId && payment.paymentTypeId !== filters.paymentTypeId) return false;
    if (filters.docs === "complete" && !payment.docsComplete) return false;
    if (filters.docs === "pending" && payment.docsComplete) return false;
    return true;
  });
}

export type DateOrder = "desc" | "asc";

/** Grouped by "YYYY-MM", newest first by default. Payment dates are calendar dates, no timezone math needed. */
export function groupPaymentsByMonth<T extends { paymentDate: string; createdAt: string }>(
  payments: T[],
  order: DateOrder = "desc"
): { month: string; payments: T[] }[] {
  const direction = order === "asc" ? 1 : -1;
  const sorted = [...payments].sort(
    (a, b) => direction * (a.paymentDate.localeCompare(b.paymentDate) || a.createdAt.localeCompare(b.createdAt))
  );
  const groups = new Map<string, T[]>();
  for (const payment of sorted) {
    const month = payment.paymentDate.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), payment]);
  }
  return Array.from(groups, ([month, items]) => ({ month, payments: items }));
}

export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const label = new Date(Date.UTC(year, monthIndex - 1, 1, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatPaymentDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Today as YYYY-MM-DD in São Paulo, the default date for a new payment. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PROJECT_TIMEZONE }).format(new Date());
}
