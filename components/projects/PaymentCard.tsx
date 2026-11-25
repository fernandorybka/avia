"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, ChevronDown, CircleAlert, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/shared/editable";
import { formatCents } from "@/lib/money";
import { checklistStatus, formatPaymentDate, type ChecklistItem, type ChecklistState } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { deletePaymentAction, setChecklistStateAction } from "@/services/project-actions";
import type { BudgetItemView, PaymentTypeView, PaymentView } from "@/services/project-services";
import { PaymentDialog } from "./PaymentDialog";

type MarkState = ChecklistState | "pending";

export function DocsBadge({ complete, pending }: { complete: boolean; pending: number }) {
  return complete ? (
    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 />
      Documentação completa
    </Badge>
  ) : (
    <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
      <CircleAlert />
      Pendente ({pending})
    </Badge>
  );
}

function ChecklistRow({
  item,
  state,
  onChange,
}: {
  item: ChecklistItem;
  state: MarkState;
  onChange: (next: MarkState) => void;
}) {
  const options: { value: MarkState; label: string }[] = [
    { value: "pending", label: "Pendente" },
    { value: "done", label: "Ok" },
    ...(item.allowNotApplicable ? [{ value: "na" as const, label: "Não se aplica" }] : []),
  ];

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <span className={cn("text-sm", state === "done" && "text-muted-foreground line-through decoration-1")}>{item.label}</span>
      <div role="radiogroup" aria-label={item.label} className="flex gap-1 rounded-lg bg-muted p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={state === option.value}
            onClick={() => state !== option.value && onChange(option.value)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer",
              state === option.value
                ? option.value === "done"
                  ? "bg-emerald-600 text-white"
                  : "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </li>
  );
}

/** Columns of the compact (spreadsheet-like) timeline, shared with its header row. Phones keep date, budget item and value. */
export const COMPACT_GRID =
  "grid grid-cols-[4.5rem_minmax(0,1fr)_6.5rem_1rem] md:grid-cols-[5.5rem_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_7rem_1rem] items-center gap-x-3";

export function CompactTimelineHeader() {
  return (
    <div className={cn(COMPACT_GRID, "border-b border-l-4 border-l-transparent px-3 py-1.5 text-xs font-medium text-muted-foreground")}>
      <span>Data</span>
      <span>Rubrica</span>
      <span className="hidden md:block">Favorecido</span>
      <span className="hidden md:block">Comentário</span>
      <span className="hidden md:block">Pendências</span>
      <span className="text-right">Valor</span>
      <span />
    </div>
  );
}

export function PaymentCard({
  projectId,
  payment,
  items,
  types,
  showBudgetItem = true,
  initiallyExpanded = false,
  scrollIntoViewOnMount = false,
  compact = false,
}: {
  projectId: string;
  payment: PaymentView;
  items: BudgetItemView[];
  types: PaymentTypeView[];
  /** Timeline: budget item as the title. Inside a budget item row it's redundant, so the payee is. */
  showBudgetItem?: boolean;
  /** Starts open (e.g. just registered, or "Abrir todos"); the person can still toggle it */
  initiallyExpanded?: boolean;
  /** Just registered: bring it into view */
  scrollIntoViewOnMount?: boolean;
  /** One spreadsheet-like line per payment (timeline only) */
  compact?: boolean;
}) {
  // null until the person toggles, so a payment that arrives "just registered" opens by itself
  const [toggled, setToggled] = useState<boolean | null>(null);
  const expanded = toggled ?? initiallyExpanded;
  const scrolledIntoView = useRef(false);
  const [, startTransition] = useTransition();
  // Reducer form so quick taps on several items stack up instead of overwriting each other
  const [checklist, applyMark] = useOptimistic(
    payment.checklist,
    (current, { itemId, next }: { itemId: string; next: MarkState }) => {
      const updated = { ...current };
      if (next === "pending") delete updated[itemId];
      else updated[itemId] = next;
      return updated;
    }
  );

  const type = types.find((entry) => entry.id === payment.paymentTypeId);
  const activeItems = type?.items.filter((item) => !item.archived) ?? [];
  const status = checklistStatus(activeItems, checklist);
  const budgetItem = items.find((item) => item.id === payment.budgetItemId);
  const pendingItems = activeItems.filter((item) => {
    const state = checklist[item.id];
    return !(state === "done" || (state === "na" && item.allowNotApplicable));
  });
  const title = showBudgetItem ? (budgetItem?.label ?? "Sem rubrica") : payment.payee;
  const subtitle = showBudgetItem ? `${payment.payee} · ${type?.name ?? "—"}` : (type?.name ?? "—");

  // Each tap is its own transition: the mark shows at once and the other items stay clickable
  const mark = (itemId: string, next: MarkState) =>
    startTransition(async () => {
      applyMark({ itemId, next });
      const result = await setChecklistStateAction(projectId, payment.id, itemId, next);
      if (!result.ok) toast.error(result.error);
    });

  return (
    <li
      // Green when the documentation is complete; pending ones stay plain (their badge and missing items say it)
      className={cn(
        "border-l-4",
        status.complete ? "border-l-emerald-500 bg-emerald-500/30 dark:bg-emerald-500/40" : "border-l-transparent"
      )}
      ref={(element) => {
        if (!scrollIntoViewOnMount || !element || scrolledIntoView.current) return;
        scrolledIntoView.current = true;
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }}
    >
      {compact ? (
        <button
          type="button"
          onClick={() => setToggled(!expanded)}
          aria-expanded={expanded}
          className={cn(COMPACT_GRID, "w-full px-3 py-1.5 text-left text-sm cursor-pointer hover:bg-muted/40")}
        >
          <span className="text-xs tabular-nums text-muted-foreground">{formatPaymentDate(payment.paymentDate)}</span>
          <span className="truncate font-medium text-foreground" title={budgetItem?.label ?? "Sem rubrica"}>
            {budgetItem?.label ?? "Sem rubrica"}
          </span>
          <span className="hidden truncate md:block" title={`${payment.payee} · ${type?.name ?? "—"}`}>
            {payment.payee}
          </span>
          <span className="hidden truncate italic text-muted-foreground md:block" title={payment.comment || undefined}>
            {payment.comment}
          </span>
          <span
            className="hidden truncate text-xs font-medium text-amber-700 dark:text-amber-400 md:block"
            title={pendingItems.map((item) => item.label).join(", ") || undefined}
          >
            {pendingItems.map((item) => item.label).join(", ")}
          </span>
          <span className="text-right font-semibold tabular-nums text-foreground">{formatCents(payment.amountCents)}</span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setToggled(!expanded)}
          aria-expanded={expanded}
          className="flex w-full items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-muted/40"
        >
          <span className="w-20 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
            {formatPaymentDate(payment.paymentDate)}
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className={cn("block font-semibold text-foreground", showBudgetItem ? "text-base" : "text-sm")}>{title}</span>
            <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
            {/* Visible while closed: what's still missing and any note about it */}
            {!expanded && pendingItems.length > 0 && (
              <span className="flex flex-wrap gap-1 pt-0.5">
                {pendingItems.map((item) => (
                  <span
                    key={item.id}
                    className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[0.7rem] font-medium text-amber-700 dark:text-amber-400"
                  >
                    {item.label}
                  </span>
                ))}
              </span>
            )}
            {payment.comment && (
              <span className="block whitespace-pre-wrap text-sm text-muted-foreground italic">{payment.comment}</span>
            )}
          </span>
          <span className="hidden pt-0.5 sm:block">
            <DocsBadge complete={status.complete} pending={status.pending} />
          </span>
          <span className="font-semibold tabular-nums text-foreground">{formatCents(payment.amountCents)}</span>
          <ChevronDown className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      {expanded && (
        <div className="space-y-3 bg-muted/30 px-4 py-3">
          <div className="sm:hidden">
            <DocsBadge complete={status.complete} pending={status.pending} />
          </div>
          {activeItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este tipo não exige documentos.</p>
          ) : (
            <ul className="divide-y">
              {activeItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  state={checklist[item.id] === "na" && !item.allowNotApplicable ? "pending" : (checklist[item.id] ?? "pending")}
                  onChange={(next) => mark(item.id, next)}
                />
              ))}
            </ul>
          )}
          <div className="flex items-center justify-end gap-2">
            <PaymentDialog
              projectId={projectId}
              items={items}
              types={types}
              payment={payment}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil />
                  Editar
                </Button>
              }
            />
            <ConfirmDeleteButton
              label="Excluir pagamento"
              onConfirm={() =>
                startTransition(async () => {
                  const result = await deletePaymentAction(projectId, payment.id);
                  if (!result.ok) toast.error(result.error);
                })
              }
            />
          </div>
        </div>
      )}
    </li>
  );
}
