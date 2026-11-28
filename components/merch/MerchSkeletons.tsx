"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Placeholders shaped like each Lojinha tab (see the components next to this file)

const SIZE_COUNTS = [5, 4, 5, 3];

/** Fallback for the merch access gate: the tab bar (its tab count depends on the role) plus the current tab. */
export function MerchRouteSkeleton() {
  return (
    <LoadingRegion className="space-y-5">
      <Skeleton className="h-11 rounded-xl" />
      <Suspense fallback={<MerchSellSkeletonBody />}>
        <MerchTabBodyFromUrl />
      </Suspense>
    </LoadingRegion>
  );
}

function MerchTabBodyFromUrl() {
  const pathname = usePathname();
  if (pathname === "/merch/products") return <MerchProductsSkeletonBody />;
  if (pathname === "/merch/sales") return <MerchSalesSkeletonBody />;
  if (pathname === "/merch/team") return <MerchTeamSkeletonBody />;
  return <MerchSellSkeletonBody />;
}

function ProductCardFrame({ children }: { children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Skeleton className="h-1.5 rounded-none" />
      <div className="space-y-3 p-4">{children}</div>
    </article>
  );
}

// ---------- Vender ----------

function MerchSellSkeletonBody() {
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-3 gap-2">
        {["w-20", "w-20", "w-10"].map((label, index) => (
          <div key={index} className="rounded-xl border bg-card px-3 py-3 shadow-sm">
            <SkeletonText size="xs" className={label} />
            <div className="mt-1">
              <SkeletonText size="lg" className="w-12" />
            </div>
          </div>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-2">
        {SIZE_COUNTS.map((sizes, index) => (
          <ProductCardFrame key={index}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full" />
              <div className="flex-1">
                <SkeletonText size="lg" className={index % 2 ? "w-28" : "w-36"} />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: sizes }, (_, size) => (
                <div key={size} className="flex h-14 flex-col items-center justify-center gap-1.5 rounded-xl border">
                  <Skeleton className="h-4 w-6 rounded" />
                  <Skeleton className="h-3 w-4 rounded" />
                </div>
              ))}
            </div>
          </ProductCardFrame>
        ))}
      </section>
    </div>
  );
}

export function MerchSellSkeleton() {
  return (
    <LoadingRegion>
      <MerchSellSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Estoque ----------

function MerchProductsSkeletonBody() {
  return (
    <div className="space-y-4">
      <SkeletonText size="sm" className="w-80 max-w-full" />
      <div className="flex gap-2 rounded-2xl border border-dashed p-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="h-10 w-12 rounded-lg" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {SIZE_COUNTS.slice(0, 2).map((sizes, index) => (
          <ProductCardFrame key={index}>
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1">
                <SkeletonText size="lg" className={index ? "w-28" : "w-36"} />
              </div>
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-1.5">
              <SkeletonText size="sm" className="w-16" />
              <SkeletonText className="w-14" />
            </div>
            <div>
              <div className="flex items-center justify-between px-2">
                <SkeletonText size="xs" className="w-16" />
                <SkeletonText size="xs" className="w-24" />
              </div>
              <div className="divide-y">
                {Array.from({ length: Math.min(sizes, 3) }, (_, row) => (
                  <div key={row} className="flex items-center gap-2 py-1.5">
                    <SkeletonText className="w-8" />
                    <div className="ml-auto flex items-center gap-1">
                      <Skeleton className="size-8 rounded-lg" />
                      <Skeleton className="mx-3 h-5 w-6 rounded" />
                      <Skeleton className="size-8 rounded-lg" />
                    </div>
                    <Skeleton className="size-7 rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-9 flex-1 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </ProductCardFrame>
        ))}
      </div>
    </div>
  );
}

export function MerchProductsSkeleton() {
  return (
    <LoadingRegion>
      <MerchProductsSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Vendas ----------

function MerchSalesSkeletonBody() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SkeletonText size="sm" className="w-36" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
      {[4, 2].map((count, day) => (
        <section key={day} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
            <SkeletonText size="sm" className="w-40" />
            <SkeletonText size="sm" className="w-20" />
          </header>
          <ul className="divide-y">
            {Array.from({ length: count }, (_, row) => (
              <li key={row} className="flex items-center gap-3 px-4 py-3">
                <span className="w-11 shrink-0">
                  <SkeletonText size="xs" className="w-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <SkeletonText className={cn(row % 2 ? "w-32" : "w-40")} />
                  <SkeletonText size="xs" className="w-24" />
                </span>
                <SkeletonText className="w-16" />
                <ChevronDown className="size-4 text-muted-foreground/40" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function MerchSalesSkeleton() {
  return (
    <LoadingRegion>
      <MerchSalesSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Equipe ----------

function MerchTeamSkeletonBody() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <SkeletonText size="sm" className="w-full" />
        <SkeletonText size="sm" className="w-1/2" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
        {["w-56", "w-44", "w-64"].map((width) => (
          <li key={width} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <SkeletonText className={cn(width, "max-w-full")} />
            </div>
            <Skeleton className="size-7 rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MerchTeamSkeleton() {
  return (
    <LoadingRegion>
      <MerchTeamSkeletonBody />
    </LoadingRegion>
  );
}
