import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Shirt } from "lucide-react";
import { canCurrentUserAccessMerch, isCurrentUserAdmin } from "@/lib/admin";
import { MerchNav } from "@/components/merch/MerchNav";

export default async function MerchLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const [canAccess, isAdmin] = await Promise.all([canCurrentUserAccessMerch(), isCurrentUserAdmin()]);

  if (!canAccess) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-24">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Shirt className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Lojinha Miçanga</h1>
          </div>
          <MerchNav isAdmin={isAdmin} />
          {children}
        </div>
      </main>
    </div>
  );
}
