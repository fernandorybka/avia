import { asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { merchProducts, merchSales, merchVariants } from "@/db/schema";
import { MERCH_TIMEZONE, sortVariants, type MerchProduct, type MerchSale, type MerchToday } from "@/lib/merch";

export async function getMerchProducts(): Promise<MerchProduct[]> {
  const [products, variants] = await Promise.all([
    db.select().from(merchProducts).orderBy(asc(merchProducts.createdAt)),
    db.select().from(merchVariants).orderBy(asc(merchVariants.createdAt)),
  ]);

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    color: product.color,
    price: product.price,
    variants: sortVariants(
      variants
        .filter((variant) => variant.productId === product.id)
        .map((variant) => ({ id: variant.id, size: variant.size, quantity: variant.quantity }))
    ),
  }));
}

export async function getMerchToday(): Promise<MerchToday> {
  const sameDay = sql`(${merchSales.createdAt} at time zone ${MERCH_TIMEZONE})::date = (now() at time zone ${MERCH_TIMEZONE})::date`;
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${merchSales.price}), 0)::float`,
    })
    .from(merchSales)
    .where(sameDay);

  return { count: row?.count ?? 0, revenue: row?.revenue ?? 0 };
}

export async function getMerchSales(): Promise<MerchSale[]> {
  const rows = await db.select().from(merchSales).orderBy(desc(merchSales.createdAt));
  return rows.map((sale) => ({
    id: sale.id,
    variantId: sale.variantId,
    productName: sale.productName,
    size: sale.size,
    price: sale.price,
    soldBy: sale.soldBy,
    createdAt: sale.createdAt.toISOString(),
  }));
}
