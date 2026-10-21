import { MerchSalesLog } from "@/components/merch/MerchSalesLog";
import { getMerchSales } from "@/services/merch-services";

export default async function MerchSalesPage() {
  const sales = await getMerchSales();
  return <MerchSalesLog sales={sales} />;
}
