"use client";

import { ChevronDown, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { formatCents } from "@/lib/money";
import { formatPaymentDate } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { useStoredFlag } from "@/lib/use-stored-flag";
import type { BudgetItemView, PaymentTypeView, PaymentView, ProjectTotals } from "@/services/project-services";

/** Donut showing the share of the budget still available. */
function AvailableRing({ available, overspent }: { available: number; overspent: boolean }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(Math.max(available, 0), 1);
  const percent = overspent ? 0 : Math.round(available * 100);

  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn(
            "transition-[stroke-dashoffset] duration-700",
            overspent ? "stroke-destructive" : "stroke-emerald-500"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-lg font-bold tabular-nums leading-none",
            overspent ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {percent}%
        </span>
        <span className="mt-0.5 text-[0.65rem] text-muted-foreground">disponível</span>
      </div>
    </div>
  );
}

export function BudgetTotalsCard({
  totals,
  onShowOverspent,
}: {
  totals: ProjectTotals;
  onShowOverspent: () => void;
}) {
  const { plannedCents, paidCents, balanceCents, overspentCount } = totals;
  const overspent = balanceCents < 0;
  const available = plannedCents > 0 ? balanceCents / plannedCents : 0;
  const executed = plannedCents > 0 ? paidCents / plannedCents : 0;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:flex-1">
          <AvailableRing available={available} overspent={overspent} />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Saldo disponível</p>
            <p
              className={cn(
                "text-3xl font-bold tracking-tight tabular-nums sm:text-4xl",
                overspent ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatCents(balanceCents)}
            </p>
            {overspentCount > 0 && (
              <button
                type="button"
                onClick={onShowOverspent}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-destructive hover:underline"
              >
                <TriangleAlert className="size-3.5" />
                {overspentCount === 1 ? "1 rubrica estourada" : `${overspentCount} rubricas estouradas`}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-4 sm:w-72 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div>
            <p className="text-xs text-muted-foreground">Previsto</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{formatCents(plannedCents)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{formatCents(paidCents)}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-[width] duration-700", overspent ? "bg-destructive" : "bg-primary")}
                style={{ width: `${Math.min(executed, 1) * 100}%` }}
              />
            </div>
            <p className="text-xs tabular-nums text-muted-foreground">{Math.round(executed * 100)}% executado</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function missingLabels(payment: PaymentView, types: PaymentTypeView[]): string[] {
  const type = types.find((entry) => entry.id === payment.paymentTypeId);
  return (type?.items ?? [])
    .filter((item) => !item.archived)
    .filter((item) => {
      const state = payment.checklist[item.id];
      return !(state === "done" || (state === "na" && item.allowNotApplicable));
    })
    .map((item) => item.label);
}

/** Collapsible strip listing payments whose documentation is still incomplete. */
export function PendingDocsPanel({
  payments,
  items,
  types,
  onSelect,
}: {
  payments: PaymentView[];
  items: BudgetItemView[];
  types: PaymentTypeView[];
  onSelect: (payment: PaymentView) => void;
}) {
  const [open, setOpen] = useStoredFlag("avia:rubricas-pending-open");
  const pending = payments
    .filter((payment) => !payment.docsComplete)
    .toSorted((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CircleCheck className="size-4" />
        Nenhuma pendência de documentação.
      </div>
    );
  }

  const itemLabel = new Map(items.map((item) => [item.id, item.label]));

  return (
    <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm hover:bg-amber-500/10"
      >
        <CircleAlert className="size-4 text-amber-600 dark:text-amber-400" />
        <span className="font-medium text-amber-700 dark:text-amber-400">
          {pending.length === 1 ? "1 pagamento" : `${pending.length} pagamentos`} com documentação pendente
        </span>
        <span className="ml-auto text-xs text-muted-foreground">{open ? "Ocultar" : "Ver"}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="max-h-64 divide-y divide-amber-500/15 overflow-y-auto border-t border-amber-500/20">
          {pending.map((payment) => {
            const missing = missingLabels(payment, types);
            return (
              <li key={payment.id}>
                <button
                  type="button"
                  onClick={() => onSelect(payment)}
                  title="Abrir na rubrica"
                  className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1 px-4 py-2 text-left text-sm hover:bg-amber-500/10"
                >
                  <span className="pt-0.5 text-xs tabular-nums text-muted-foreground">
                    {formatPaymentDate(payment.paymentDate)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {payment.budgetItemId ? (itemLabel.get(payment.budgetItemId) ?? "—") : "Sem rubrica"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{payment.payee}</span>
                  </span>
                  <span className="text-right font-semibold tabular-nums text-foreground">
                    {formatCents(payment.amountCents)}
                  </span>
                  {missing.length > 0 && (
                    <span className="col-start-2 col-end-4 flex flex-wrap gap-1">
                      {missing.map((label) => (
                        <span
                          key={label}
                          className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-amber-700 dark:text-amber-400"
                        >
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
