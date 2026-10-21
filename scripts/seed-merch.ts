// One-off import of the Lojinha Miçanga stock (from the old Google Sheet, Oct 2026).
// Run with: npx tsx scripts/seed-merch.ts — does nothing if products already exist.
import "dotenv/config";

import { count } from "drizzle-orm";
import { db } from "../db";
import { merchProducts, merchVariants } from "../db/schema";

const PRICE = 60;

const stock: { name: string; color: string; sizes: Record<string, number> }[] = [
  { name: "Branca", color: "#f5f5f4", sizes: { P: 2, M: 2, G: 2, XG: 1 } },
  { name: "Verde Musgo", color: "#5b6b3a", sizes: { P: 3, M: 2, G: 4, GG: 1, XG: 1 } },
  { name: "Roxo", color: "#6d3fa3", sizes: { P: 3, M: 4, G: 4, GG: 1, XG: 1 } },
  { name: "Am. Ouro", color: "#d9a514", sizes: { P: 3, M: 3, G: 4, GG: 1, XG: 1 } },
  { name: "Azulzinha", color: "#7db8e8", sizes: { P: 1, M: 3, G: 1, XG: 1 } },
  { name: "Vermelha", color: "#d62828", sizes: { P: 2, M: 2, G: 2 } },
  { name: "Telha", color: "#c2602f", sizes: { P: 1, M: 1, G: 1 } },
  { name: "Preta", color: "#1c1917", sizes: { M: 1, G: 1, GG: 1, XG: 1 } },
  { name: "Rosa", color: "#f2a7c3", sizes: { GG: 1 } },
];

async function main() {
  const [{ total }] = await db.select({ total: count() }).from(merchProducts);
  if (total > 0) {
    console.log(`merch_products already has ${total} rows, skipping.`);
    return;
  }

  for (const item of stock) {
    const [product] = await db
      .insert(merchProducts)
      .values({ name: item.name, color: item.color, price: PRICE })
      .returning({ id: merchProducts.id });

    await db
      .insert(merchVariants)
      .values(Object.entries(item.sizes).map(([size, quantity]) => ({ productId: product.id, size, quantity })));
  }

  const units = stock.reduce((sum, item) => sum + Object.values(item.sizes).reduce((a, b) => a + b, 0), 0);
  console.log(`Imported ${stock.length} products, ${units} units.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
