"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ChevronDown, FileSpreadsheet, Plus, Rows3, Rows4 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCents } from "@/lib/money";
import {
  BUDGET_ITEM_PROGRESS_LABELS,
  budgetItemProgress,
  type BudgetItemProgress,
} from "@/lib/projects";
import { cn } from "@/lib/utils";
import { useStoredFlag } from "@/lib/use-stored-flag";
import type { BudgetItemView, ProjectData } from "@/services/project-services";
import { PaymentCard } from "./PaymentCard";
import { PaymentDialog } from "./PaymentDialog";

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums text-foreground",
          tone === "danger" && "text-destructive",
          tone === "warning" && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ProgressBar({ item }: { item: BudgetItemView }) {
  return (
    <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full",
          item.overspent ? "bg-destructive" : item.plannedCents > 0 && item.balanceCents === 0 ? "bg-emerald-600" : "bg-primary"
        )}
        style={{ width: `${Math.round(item.progress * 100)}%` }}
      />
    </div>
  );
}

export function BudgetItemsView({ projectId, data }: { projectId: string; data: ProjectData }) {
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  // A new payment shows up open, inside its budget item, ready for the checklist
  const showCreated = ({ id, budgetItemId }: { id: string; budgetItemId: string | null }) => {
    setJustCreatedId(id);
    if (budgetItemId) setOpenItemId(budgetItemId);
  };
  const { items, payments, types, totals } = data;
  const [progressFilter, setProgressFilter] = useState<BudgetItemProgress | null>(null);
  const [compact, setCompact] = useStoredFlag("avia:rubricas-compact");
  const progressOf = new Map(items.map((item) => [item.id, budgetItemProgress(item)]));
  const visibleItems = progressFilter ? items.filter((item) => progressOf.get(item.id) === progressFilter) : items;
  // "Todas" plus only the statuses that actually occur, each with how many budget items it has
  const progressOptions: { progress: BudgetItemProgress | null; label: string; count: number }[] = [
    { progress: null, label: "Todas", count: items.length },
    ...(Object.keys(BUDGET_ITEM_PROGRESS_LABELS) as BudgetItemProgress[])
      .map((progress) => ({
        progress,
        label: BUDGET_ITEM_PROGRESS_LABELS[progress],
        count: items.filter((item) => progressOf.get(item.id) === progress).length,
      }))
      .filter(({ count }) => count > 0),
  ];
  // Filtered: sums of the visible rows. Unfiltered: project totals (they include payments without a budget item)
  const footer = progressFilter
    ? {
        plannedCents: visibleItems.reduce((sum, item) => sum + item.plannedCents, 0),
        paidCents: visibleItems.reduce((sum, item) => sum + item.paidCents, 0),
        balanceCents: visibleItems.reduce((sum, item) => sum + item.balanceCents, 0),
      }
    : totals;
  const withoutItem = payments.filter((payment) => payment.budgetItemId === null);

  if (items.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed p-8 text-center">
        <FileSpreadsheet className="mx-auto size-8 text-muted-foreground" />
        <p className="text-muted-foreground">Suba a planilha de orçamento para criar as rubricas.</p>
        <Button asChild>
          <Link href={`/projetos/${projectId}/orcamento`}>Importar orçamento</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SummaryTile label="Previsto" value={formatCents(totals.plannedCents)} />
        <SummaryTile label="Pago" value={formatCents(totals.paidCents)} />
        <SummaryTile label="Saldo" value={formatCents(totals.balanceCents)} tone={totals.balanceCents < 0 ? "danger" : undefined} />
        <SummaryTile
          label="Documentação pendente"
          value={String(totals.pendingDocsCount)}
          tone={totals.pendingDocsCount > 0 ? "warning" : undefined}
        />
        <SummaryTile
          label="Rubricas estouradas"
          value={String(totals.overspentCount)}
          tone={totals.overspentCount > 0 ? "danger" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Filtrar rubricas por situação" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {progressOptions.map(({ progress, label, count }) => {
            const active = progressFilter === progress;
            return (
              <button
                key={progress ?? "all"}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setProgressFilter(progress)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label} <span className="text-xs tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setCompact(!compact)} aria-pressed={compact}>
            {compact ? <Rows3 /> : <Rows4 />}
            {compact ? "Expandida" : "Compacta"}
          </Button>
          <PaymentDialog
            projectId={projectId}
            items={items}
            types={types}
            onCreated={showCreated}
            trigger={
              <Button>
                <Plus />
                Registrar pagamento
              </Button>
            }
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Rubrica</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="hidden w-32 md:table-cell" />
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  Nenhuma rubrica nessa situação.
                </TableCell>
              </TableRow>
            )}
            {visibleItems.map((item) => {
              const open = openItemId === item.id;
              const itemPayments = payments.filter((payment) => payment.budgetItemId === item.id);
              return (
                <Fragment key={item.id}>
                  <TableRow
                    aria-expanded={open}
                    className={cn(
                      "cursor-pointer",
                      // Fully paid: same green as complete documentation
                      progressOf.get(item.id) === "concluida" &&
                        "bg-emerald-500/30 hover:bg-emerald-500/40 dark:bg-emerald-500/40 dark:hover:bg-emerald-500/50"
                    )}
                    onClick={() => setOpenItemId(open ? null : item.id)}
                  >
                    <TableCell className={cn("max-w-72 pl-4", compact ? "py-1" : "whitespace-normal")}>
                      {compact ? (
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-foreground" title={item.label}>
                            {item.label}
                          </span>
                          {item.status === "out_of_budget" && <Badge variant="outline">Fora do orçamento</Badge>}
                          {item.overspent && <Badge variant="destructive">Estourada</Badge>}
                        </span>
                      ) : (
                        <>
                          <span className="font-medium text-foreground">{item.label}</span>
                          <span className="ml-2 inline-flex gap-1 align-middle">
                            {item.status === "out_of_budget" && <Badge variant="outline">Fora do orçamento</Badge>}
                            {item.overspent && <Badge variant="destructive">Estourada</Badge>}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {item.paymentCount === 0 ? "Nenhum pagamento" : `${item.paymentCount} pagamento(s)`}
                          </span>
                        </>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", compact && "py-1")}>{formatCents(item.plannedCents)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", compact && "py-1")}>{formatCents(item.paidCents)}</TableCell>
                    <TableCell
                      className={cn("text-right font-semibold tabular-nums", item.overspent && "text-destructive", compact && "py-1")}
                    >
                      {formatCents(item.balanceCents)}
                    </TableCell>
                    <TableCell className={cn("hidden md:table-cell", compact && "py-1")}>
                      <ProgressBar item={item} />
                    </TableCell>
                    <TableCell className={cn(compact && "py-1")}>
                      <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </TableCell>
                  </TableRow>
                  {open && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="whitespace-normal bg-muted/20 p-0">
                        {itemPayments.length > 0 && (
                          <ul className="divide-y">
                            {itemPayments
                              .toSorted((a, b) => b.paymentDate.localeCompare(a.paymentDate))
                              .map((payment) => (
                                <PaymentCard
                                  key={payment.id}
                                  projectId={projectId}
                                  payment={payment}
                                  items={items}
                                  types={types}
                                  showBudgetItem={false}
                                  initiallyExpanded={payment.id === justCreatedId}
                                  scrollIntoViewOnMount={payment.id === justCreatedId}
                                />
                              ))}
                          </ul>
                        )}
                        <div className="flex justify-end px-4 py-3">
                          <PaymentDialog
                            projectId={projectId}
                            items={items}
                            types={types}
                            defaultBudgetItemId={item.id}
                            onCreated={showCreated}
                            trigger={
                              <Button variant="secondary" size="sm">
                                <Plus />
                                Registrar pagamento nesta rubrica
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="pl-4">{progressFilter ? `Total (${visibleItems.length} rubricas)` : "Total"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCents(footer.plannedCents)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCents(footer.paidCents)}</TableCell>
              <TableCell className={cn("text-right tabular-nums", footer.balanceCents < 0 && "text-destructive")}>
                {formatCents(footer.balanceCents)}
              </TableCell>
              <TableCell className="hidden md:table-cell" />
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {withoutItem.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Pagamentos sem rubrica (ex.: devoluções)</h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {withoutItem.map((payment) => (
              <PaymentCard
                key={payment.id}
                projectId={projectId}
                payment={payment}
                items={items}
                types={types}
                initiallyExpanded={payment.id === justCreatedId}
                scrollIntoViewOnMount={payment.id === justCreatedId}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
