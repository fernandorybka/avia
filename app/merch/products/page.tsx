import { MerchProductsEditor } from "@/components/merch/MerchProductsEditor";
import { getMerchProducts } from "@/services/merch-services";

export default async function MerchProductsPage() {
  const products = await getMerchProducts();
  return <MerchProductsEditor products={products} />;
}
