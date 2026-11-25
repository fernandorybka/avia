"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronsDownUp, ChevronsUpDown, Plus, Rows3, Rows4, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { formatCents } from "@/lib/money";
import { filterPayments, formatMonth, groupPaymentsByMonth, type DateOrder, type PaymentFilters } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { useStoredFlag } from "@/lib/use-stored-flag";
import type { ProjectData } from "@/services/project-services";
import { CompactTimelineHeader, PaymentCard } from "./PaymentCard";
import { PaymentDialog } from "./PaymentDialog";

const ALL = "all";

const DOCS_OPTIONS = [
  { value: ALL, label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "complete", label: "Completos" },
] as const;

// Filters live in the URL so a filtered view can be reloaded; they only ever hold ids and enums
export function PaymentTimeline({ projectId, data }: { projectId: string; data: ProjectData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [compact, setCompact] = useStoredFlag("avia:timeline-compact");
  // "Abrir/Fechar todos" remounts the cards (new key) with that starting state; each can still be toggled after
  const [allOpen, setAllOpen] = useState({ open: false, round: 0 });
  const { items, payments, types } = data;

  const filters: PaymentFilters = {
    budgetItemId: searchParams.get("rubrica"),
    paymentTypeId: searchParams.get("tipo"),
    docs: (["complete", "pending"] as const).find((value) => value === searchParams.get("docs")) ?? null,
  };
  const hasFilters = Boolean(filters.budgetItemId || filters.paymentTypeId || filters.docs);
  const filtered = filterPayments(payments, filters);
  const order: DateOrder = searchParams.get("ordem") === "antigos" ? "asc" : "desc";
  const groups = groupPaymentsByMonth(filtered, order);
  const pendingCount = payments.filter((payment) => !payment.docsComplete).length;

  const setFilter = (key: "rubrica" | "tipo" | "docs" | "ordem", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Documentação" className="flex gap-1 rounded-lg bg-muted p-1">
            {DOCS_OPTIONS.map((option) => {
              const active = (filters.docs ?? ALL) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFilter("docs", option.value)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                    active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                  {option.value === "pending" && pendingCount > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-700 dark:text-amber-400">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="ml-auto">
            <PaymentDialog
              projectId={projectId}
              items={items}
              types={types}
              onCreated={({ id }) => setJustCreatedId(id)}
              trigger={
                <Button>
                  <Plus />
                  Registrar pagamento
                </Button>
              }
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-80">
            <SearchSelect
              value={filters.budgetItemId ?? ALL}
              onChange={(value) => setFilter("rubrica", value)}
              options={[
                { value: ALL, label: "Todas as rubricas" },
                { value: "none", label: "Sem rubrica" },
                ...items.map((item) => ({ value: item.id, label: item.label })),
              ]}
              placeholder="Todas as rubricas"
              searchPlaceholder="Buscar rubrica…"
              emptyText="Nenhuma rubrica encontrada."
            />
          </div>
          <Select value={filters.paymentTypeId ?? ALL} onValueChange={(value) => setFilter("tipo", value)}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os tipos</SelectItem>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setJustCreatedId(null);
              setAllOpen(({ open, round }) => ({ open: !open, round: round + 1 }));
            }}
          >
            {allOpen.open ? <ChevronsDownUp /> : <ChevronsUpDown />}
            {allOpen.open ? "Fechar todos" : "Abrir todos"}
          </Button>
          <Button variant="outline" onClick={() => setCompact(!compact)} aria-pressed={compact}>
            {compact ? <Rows3 /> : <Rows4 />}
            {compact ? "Expandida" : "Compacta"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setFilter("ordem", order === "desc" ? "antigos" : ALL)}
            title="Inverter a ordem por data"
          >
            {order === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
            {order === "desc" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
          </Button>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Keep the chosen date order, it isn't a filter
                const query = order === "asc" ? "?ordem=antigos" : "";
                router.replace(`${pathname}${query}`, { scroll: false });
              }}
            >
              <X />
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {payments.length === 0 ? "Nenhum pagamento registrado ainda." : "Nenhum pagamento com esses filtros."}
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.month} className="space-y-2">
            <div className="flex items-baseline justify-between px-1">
              <h2 className="font-semibold text-foreground">{formatMonth(group.month)}</h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {formatCents(group.payments.reduce((sum, payment) => sum + payment.amountCents, 0))}
              </span>
            </div>
            <ul className={cn("divide-y overflow-hidden border bg-card shadow-sm", compact ? "rounded-xl" : "rounded-2xl")}>
              {compact && (
                <li aria-hidden>
                  <CompactTimelineHeader />
                </li>
              )}
              {group.payments.map((payment) => (
                <PaymentCard
                  key={`${payment.id}:${allOpen.round}`}
                  projectId={projectId}
                  payment={payment}
                  items={items}
                  types={types}
                  initiallyExpanded={allOpen.open || payment.id === justCreatedId}
                  scrollIntoViewOnMount={payment.id === justCreatedId}
                  compact={compact}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
