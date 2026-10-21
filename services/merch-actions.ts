"use server";

import * as Sentry from "@sentry/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { merchProducts, merchSales, merchVariants } from "@/db/schema";
import { canCurrentUserAccessMerch } from "@/lib/admin";

type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

class MerchError extends Error {}

async function runMerchAction<T>(name: string, action: () => Promise<T>): Promise<ActionResult<T>> {
  if (!(await canCurrentUserAccessMerch())) {
    return { ok: false, error: "Acesso restrito à equipe da lojinha." };
  }

  try {
    const data = await action();
    revalidatePath("/merch", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof MerchError) {
      return { ok: false, error: error.message };
    }
    Sentry.captureException(error, { tags: { action: name } });
    console.error(`[merch] ${name} failed`, error);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
}

function requireText(value: string, label: string, maxLength: number): string {
  const text = value.trim();
  if (!text) throw new MerchError(`${label} não pode ficar vazio.`);
  if (text.length > maxLength) throw new MerchError(`${label} muito longo.`);
  return text;
}

function requirePrice(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100_000) throw new MerchError("Valor inválido.");
  return Math.round(value * 100) / 100;
}

function requireQuantity(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 100_000) throw new MerchError("Quantidade inválida.");
  return value;
}

function requireColor(value: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new MerchError("Cor inválida.");
  return value.toLowerCase();
}

/* ---------- Selling ---------- */

export async function sellMerchAction(variantId: string, price: number): Promise<ActionResult<{ saleId: string | null }>> {
  return runMerchAction("sell", async () => {
    const salePrice = requirePrice(price);

    // Atomic decrement: two sellers can't take the last unit
    const [variant] = await db
      .update(merchVariants)
      .set({ quantity: sql`${merchVariants.quantity} - 1` })
      .where(and(eq(merchVariants.id, variantId), gt(merchVariants.quantity, 0)))
      .returning({ size: merchVariants.size, productId: merchVariants.productId });

    if (!variant) {
      return { saleId: null };
    }

    try {
      const [product] = await db
        .select({ name: merchProducts.name })
        .from(merchProducts)
        .where(eq(merchProducts.id, variant.productId));
      const user = await currentUser();
      const soldBy = user?.firstName || user?.emailAddresses[0]?.emailAddress || "—";

      const [sale] = await db
        .insert(merchSales)
        .values({ variantId, productName: product?.name ?? "—", size: variant.size, price: salePrice, soldBy })
        .returning({ id: merchSales.id });

      return { saleId: sale.id };
    } catch (error) {
      // Put the unit back if the sale couldn't be recorded
      await db
        .update(merchVariants)
        .set({ quantity: sql`${merchVariants.quantity} + 1` })
        .where(eq(merchVariants.id, variantId));
      throw error;
    }
  });
}

/** Deletes a sale and puts the unit back in stock (if its variant still exists). Also used for "Desfazer". */
export async function deleteMerchSaleAction(saleId: string): Promise<ActionResult> {
  return runMerchAction("deleteSale", async () => {
    const [sale] = await db
      .delete(merchSales)
      .where(eq(merchSales.id, saleId))
      .returning({ variantId: merchSales.variantId });

    if (!sale) throw new MerchError("Essa venda já foi excluída.");

    if (sale.variantId) {
      await db
        .update(merchVariants)
        .set({ quantity: sql`${merchVariants.quantity} + 1` })
        .where(eq(merchVariants.id, sale.variantId));
    }
    return null;
  });
}

export async function updateMerchSalePriceAction(saleId: string, price: number): Promise<ActionResult> {
  return runMerchAction("updateSalePrice", async () => {
    await db.update(merchSales).set({ price: requirePrice(price) }).where(eq(merchSales.id, saleId));
    return null;
  });
}

/* ---------- Products ---------- */

export async function createMerchProductAction(name: string, price: number): Promise<ActionResult> {
  return runMerchAction("createProduct", async () => {
    await db.insert(merchProducts).values({ name: requireText(name, "Nome", 80), price: requirePrice(price) });
    return null;
  });
}

export async function updateMerchProductAction(
  productId: string,
  changes: { name?: string; color?: string; price?: number }
): Promise<ActionResult> {
  return runMerchAction("updateProduct", async () => {
    await db
      .update(merchProducts)
      .set({
        ...(changes.name !== undefined && { name: requireText(changes.name, "Nome", 80) }),
        ...(changes.color !== undefined && { color: requireColor(changes.color) }),
        ...(changes.price !== undefined && { price: requirePrice(changes.price) }),
      })
      .where(eq(merchProducts.id, productId));
    return null;
  });
}

export async function deleteMerchProductAction(productId: string): Promise<ActionResult> {
  return runMerchAction("deleteProduct", async () => {
    await db.delete(merchProducts).where(eq(merchProducts.id, productId));
    return null;
  });
}

/* ---------- Sizes ---------- */

export async function addMerchVariantAction(productId: string, size: string): Promise<ActionResult> {
  return runMerchAction("addVariant", async () => {
    await db.insert(merchVariants).values({ productId, size: requireText(size, "Tamanho", 20), quantity: 0 });
    return null;
  });
}

export async function updateMerchVariantAction(
  variantId: string,
  changes: { size?: string; quantity?: number }
): Promise<ActionResult> {
  return runMerchAction("updateVariant", async () => {
    await db
      .update(merchVariants)
      .set({
        ...(changes.size !== undefined && { size: requireText(changes.size, "Tamanho", 20) }),
        ...(changes.quantity !== undefined && { quantity: requireQuantity(changes.quantity) }),
      })
      .where(eq(merchVariants.id, variantId));
    return null;
  });
}

/** Relative change for the +/- buttons, so quick taps never overwrite each other. */
export async function adjustMerchVariantQuantityAction(variantId: string, delta: number): Promise<ActionResult> {
  return runMerchAction("adjustVariant", async () => {
    if (!Number.isInteger(delta) || Math.abs(delta) > 1000) throw new MerchError("Quantidade inválida.");
    await db
      .update(merchVariants)
      .set({ quantity: sql`greatest(${merchVariants.quantity} + ${delta}, 0)` })
      .where(eq(merchVariants.id, variantId));
    return null;
  });
}

export async function deleteMerchVariantAction(variantId: string): Promise<ActionResult> {
  return runMerchAction("deleteVariant", async () => {
    await db.delete(merchVariants).where(eq(merchVariants.id, variantId));
    return null;
  });
}
