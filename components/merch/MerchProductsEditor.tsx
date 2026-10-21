"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, parsePrice, type MerchProduct, type MerchVariant } from "@/lib/merch";
import {
  addMerchVariantAction,
  adjustMerchVariantQuantityAction,
  createMerchProductAction,
  deleteMerchProductAction,
  deleteMerchVariantAction,
  updateMerchProductAction,
  updateMerchVariantAction,
} from "@/services/merch-actions";
import { ConfirmDeleteButton, EditableCell } from "./shared";

const DEFAULT_NEW_PRICE = 60;

function notify(result: { ok: boolean; error?: string }) {
  if (!result.ok) toast.error(result.error);
  return result;
}

function priceText(value: number) {
  return formatPrice(value).replace("R$", "").trim();
}

function NewProductForm() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(String(DEFAULT_NEW_PRICE));
  const [pending, startTransition] = useTransition();
  const parsedPrice = parsePrice(price);

  return (
    <form
      className="flex gap-2 rounded-2xl border border-dashed p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim() || parsedPrice === null) return;
        startTransition(async () => {
          const result = notify(await createMerchProductAction(name, parsedPrice));
          if (result.ok) {
            setName("");
            setPrice(String(DEFAULT_NEW_PRICE));
          }
        });
      }}
    >
      <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Novo produto" maxLength={80} />
      <Input
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        inputMode="decimal"
        aria-label="Preço"
        className="w-20 shrink-0"
      />
      <Button type="submit" size="lg" disabled={pending || !name.trim() || parsedPrice === null} aria-label="Adicionar produto">
        <Plus />
      </Button>
    </form>
  );
}

function VariantRow({ variant }: { variant: MerchVariant }) {
  const [quantity, setOptimisticQuantity] = useOptimistic(variant.quantity);
  const [, startTransition] = useTransition();

  const adjust = (delta: number) => {
    if (quantity + delta < 0) return;
    startTransition(async () => {
      setOptimisticQuantity(quantity + delta);
      notify(await adjustMerchVariantQuantityAction(variant.id, delta));
    });
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <EditableCell
        value={variant.size}
        aria-label="Tamanho"
        maxLength={20}
        className="w-20 text-base font-semibold"
        onSave={(size) => updateMerchVariantAction(variant.id, { size })}
      />
      <div className="ml-auto flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label="Menos um" onClick={() => adjust(-1)} disabled={quantity === 0}>
          <Minus />
        </Button>
        <EditableCell
          value={String(quantity)}
          inputMode="numeric"
          aria-label="Em estoque"
          className="w-12 text-center text-base font-semibold tabular-nums"
          onSave={async (next) => {
            const parsed = Number(next);
            if (!Number.isInteger(parsed) || parsed < 0) return { ok: false, error: "Quantidade inválida." };
            return updateMerchVariantAction(variant.id, { quantity: parsed });
          }}
        />
        <Button variant="outline" size="icon" aria-label="Mais um" onClick={() => adjust(1)}>
          <Plus />
        </Button>
      </div>
      <ConfirmDeleteButton label="Excluir tamanho" onConfirm={async () => notify(await deleteMerchVariantAction(variant.id))} />
    </div>
  );
}

function AddVariantForm({ productId }: { productId: string }) {
  const [size, setSize] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!size.trim()) return;
        startTransition(async () => {
          if (notify(await addMerchVariantAction(productId, size)).ok) setSize("");
        });
      }}
    >
      <Input
        value={size}
        onChange={(event) => setSize(event.target.value)}
        placeholder="Novo tamanho (ex.: GG, Único)"
        maxLength={20}
        className="h-9"
      />
      <Button type="submit" variant="secondary" disabled={pending || !size.trim()}>
        <Plus />
        Tamanho
      </Button>
    </form>
  );
}

function ColorPicker({ productId, color }: { productId: string; color: string }) {
  const [current, setCurrent] = useState(color);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <label className="relative size-8 shrink-0 cursor-pointer" title="Mudar cor">
      <span
        className="block size-8 rounded-full ring-1 ring-foreground/15 shadow-inner"
        style={{ backgroundColor: current }}
      />
      <input
        type="color"
        value={current}
        aria-label="Cor"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(event) => {
          const next = event.target.value;
          setCurrent(next);
          // Pickers fire continuously while dragging; save once it settles
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(async () => {
            if (next !== color) notify(await updateMerchProductAction(productId, { color: next }));
          }, 600);
        }}
      />
    </label>
  );
}

function ProductCard({ product }: { product: MerchProduct }) {
  const [, startTransition] = useTransition();
  const available = product.variants.reduce((sum, variant) => sum + variant.quantity, 0);

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="h-1.5" style={{ backgroundColor: product.color }} />
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <ColorPicker productId={product.id} color={product.color} />
          <EditableCell
            value={product.name}
            aria-label="Nome do produto"
            maxLength={80}
            className="flex-1 text-lg font-semibold"
            onSave={(name) => updateMerchProductAction(product.id, { name })}
          />
          <ConfirmDeleteButton
            label="Excluir produto"
            onConfirm={() =>
              startTransition(async () => {
                notify(await deleteMerchProductAction(product.id));
              })
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-1.5 text-sm">
          <span className="text-muted-foreground">Preço (R$)</span>
          <EditableCell
            value={priceText(product.price)}
            inputMode="decimal"
            aria-label="Preço"
            className="w-24 text-right text-base font-semibold tabular-nums"
            onSave={async (next) => {
              const price = parsePrice(next);
              if (price === null) return { ok: false, error: "Valor inválido." };
              return updateMerchProductAction(product.id, { price });
            }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span>Tamanho</span>
            <span>Em estoque · {available}</span>
          </div>
          <div className="divide-y">
            {product.variants.map((variant) => (
              <VariantRow key={variant.id} variant={variant} />
            ))}
          </div>
          <AddVariantForm productId={product.id} />
        </div>
      </div>
    </article>
  );
}

export function MerchProductsEditor({ products }: { products: MerchProduct[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Toque em qualquer campo para editar — salva sozinho ao sair dele.
      </p>
      <NewProductForm />
      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
