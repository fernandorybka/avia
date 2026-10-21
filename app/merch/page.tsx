import { MerchSell } from "@/components/merch/MerchSell";
import { getMerchProducts, getMerchToday } from "@/services/merch-services";

export default async function MerchSellPage() {
  const [products, today] = await Promise.all([getMerchProducts(), getMerchToday()]);
  return <MerchSell products={products} today={today} />;
}
