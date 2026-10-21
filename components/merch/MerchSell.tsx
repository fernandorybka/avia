"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPrice, parsePrice, totalAvailable, type MerchProduct, type MerchToday } from "@/lib/merch";
import { deleteMerchSaleAction, sellMerchAction } from "@/services/merch-actions";
import { Swatch } from "./shared";

const REFRESH_INTERVAL_MS = 30_000;

type Selection = { product: MerchProduct; variantId: string; size: string; available: number };

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-3 shadow-sm">
      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

export function MerchSell({ products, today }: { products: MerchProduct[]; today: MerchToday }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [showPriceEditor, setShowPriceEditor] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [isSelling, startSelling] = useTransition();

  const listed = products.filter((product) => product.variants.length > 0);
  const price = selection ? (showPriceEditor ? parsePrice(priceInput) : selection.product.price) : null;

  // Keep stock fresh when several people are selling at once
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  const open = (next: Selection) => {
    setSelection(next);
    setShowPriceEditor(false);
    setPriceInput(String(next.product.price).replace(".", ","));
  };

  const undo = (saleId: string, label: string) => {
    startSelling(async () => {
      const result = await deleteMerchSaleAction(saleId);
      if (result.ok) toast.info(`Venda desfeita: ${label}`);
      else toast.error(result.error);
    });
  };

  const confirmSale = () => {
    if (!selection || price === null) return;
    const label = `${selection.product.name} ${selection.size}`;
    const salePrice = price;
    const { variantId } = selection;

    startSelling(async () => {
      const result = await sellMerchAction(variantId, salePrice);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSelection(null);
      const { saleId } = result.data;
      if (!saleId) {
        toast.warning(`${label} esgotou.`);
        return;
      }

      toast.success(`${label} vendida`, {
        description: formatPrice(salePrice),
        duration: 10_000,
        action: { label: "Desfazer", onClick: () => undo(saleId, label) },
      });
    });
  };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-3 gap-2">
        <StatTile label="Disponíveis" value={String(totalAvailable(products))} />
        <StatTile label="Vendas hoje" value={String(today.count)} />
        <StatTile label="Hoje" value={formatPrice(today.revenue).replace(",00", "")} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {listed.map((product) => {
          const available = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);
          return (
            <article
              key={product.id}
              className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", available === 0 && "opacity-60")}
            >
              <div className="h-1.5" style={{ backgroundColor: product.color }} />
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Swatch color={product.color} className="size-7" />
                  <h2 className="flex-1 text-lg font-semibold text-foreground">{product.name}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {available === 0 ? "Esgotado" : `${available} disp.`}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {product.variants.map((variant) => {
                    const soldOut = variant.quantity === 0;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={soldOut || isSelling}
                        onClick={() =>
                          open({ product, variantId: variant.id, size: variant.size, available: variant.quantity })
                        }
                        className={cn(
                          "flex h-14 min-w-0 flex-col items-center justify-center rounded-xl border px-1 text-foreground transition-all",
                          "active:scale-95 cursor-pointer hover:border-primary/50 hover:bg-primary/5",
                          "disabled:cursor-not-allowed disabled:active:scale-100",
                          soldOut && "border-dashed bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted/40"
                        )}
                        aria-label={`${product.name} ${variant.size}: ${variant.quantity} disponíveis`}
                      >
                        <span className={cn("max-w-full truncate text-base font-bold leading-none", soldOut && "line-through")}>
                          {variant.size}
                        </span>
                        <span className="mt-1 text-xs tabular-nums text-muted-foreground">{variant.quantity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {listed.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Nenhum produto cadastrado.{" "}
          <Link href="/merch/products" className="underline underline-offset-4">
            Cadastrar no Estoque
          </Link>
        </p>
      )}

      {/* Confirmation bottom sheet */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => setSelection(null)}
        className={cn(
          "fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-200",
          selection ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar venda"
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-md rounded-t-3xl border-t bg-background shadow-2xl transition-transform duration-200 ease-out",
          "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          selection ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        {selection && (
          <div className="space-y-5 px-5 pt-3">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-muted" />

            <div className="flex items-center gap-4">
              <Swatch color={selection.product.color} className="size-12" />
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-foreground truncate">
                  {selection.product.name} <span className="text-primary">{selection.size}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {selection.available} {selection.available === 1 ? "disponível" : "disponíveis"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelection(null)} aria-label="Cancelar">
                <X className="size-5" />
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">Valor</span>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {price === null ? "—" : formatPrice(price)}
                </span>
                {/* Discreet on purpose: price changes are for promos/internal sales */}
                <button
                  type="button"
                  onClick={() => setShowPriceEditor((value) => !value)}
                  aria-label="Ajustar valor"
                  className="rounded-md p-1 text-muted-foreground/40 hover:text-muted-foreground cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>

            {showPriceEditor && (
              <div className="space-y-1.5">
                <label htmlFor="merch-price" className="text-xs text-muted-foreground">
                  Valor desta venda (R$)
                </label>
                <Input
                  id="merch-price"
                  inputMode="decimal"
                  autoFocus
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  aria-invalid={price === null}
                  className="h-12 text-lg"
                />
              </div>
            )}

            <Button
              onClick={confirmSale}
              disabled={isSelling || price === null}
              className="h-14 w-full rounded-2xl text-lg font-semibold"
            >
              {isSelling ? <Loader2 className="size-5 animate-spin" /> : "Confirmar venda"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
