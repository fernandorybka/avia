"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDay,
  formatPrice,
  formatTime,
  groupSalesByDay,
  parsePrice,
  salesToCsv,
  type MerchSale,
} from "@/lib/merch";
import { deleteMerchSaleAction, updateMerchSalePriceAction } from "@/services/merch-actions";
import { ConfirmDeleteButton, EditableCell } from "./shared";

function downloadCsv(sales: MerchSale[]) {
  // BOM so Excel detects UTF-8 accents
  const blob = new Blob(["﻿" + salesToCsv(sales)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vendas-lojinha-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function SaleRow({ sale }: { sale: MerchSale }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <li className={cn(pending && "opacity-50")}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-muted/40"
      >
        <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">{formatTime(sale.createdAt)}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">
            {sale.productName} <span className="text-primary">{sale.size}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">{sale.soldBy}</span>
        </span>
        <span className="font-semibold tabular-nums text-foreground">{formatPrice(sale.price)}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="flex items-center gap-3 bg-muted/30 px-4 py-3">
          <span className="text-sm text-muted-foreground">Valor (R$)</span>
          <EditableCell
            value={sale.price.toFixed(2).replace(".", ",")}
            inputMode="decimal"
            aria-label="Valor da venda"
            className="w-24 border-border bg-background text-base font-semibold tabular-nums"
            onSave={async (next) => {
              const price = parsePrice(next);
              if (price === null) return { ok: false, error: "Valor inválido." };
              return updateMerchSalePriceAction(sale.id, price);
            }}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {sale.variantId ? "Excluir devolve ao estoque" : "Produto não existe mais"}
            </span>
            <ConfirmDeleteButton
              label="Excluir venda"
              onConfirm={() =>
                startTransition(async () => {
                  const result = await deleteMerchSaleAction(sale.id);
                  if (result.ok) toast.info(`Venda excluída: ${sale.productName} ${sale.size}`);
                  else toast.error(result.error);
                })
              }
            />
          </div>
        </div>
      )}
    </li>
  );
}

export function MerchSalesLog({ sales }: { sales: MerchSale[] }) {
  const groups = groupSalesByDay(sales);

  if (sales.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nenhuma venda registrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {sales.length} {sales.length === 1 ? "venda" : "vendas"} · {formatPrice(sales.reduce((sum, sale) => sum + sale.price, 0))}
        </span>
        <Button variant="outline" size="sm" onClick={() => downloadCsv(sales)}>
          <Download />
          Baixar CSV
        </Button>
      </div>

      {groups.map((group) => (
        <section key={group.day} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <h2 className="text-sm font-semibold capitalize text-foreground">{formatDay(group.day)}</h2>
            <span className="text-sm tabular-nums text-muted-foreground">
              {group.sales.length} · <span className="font-semibold text-foreground">{formatPrice(group.revenue)}</span>
            </span>
          </header>
          <ul className="divide-y">
            {group.sales.map((sale) => (
              <SaleRow key={sale.id} sale={sale} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
