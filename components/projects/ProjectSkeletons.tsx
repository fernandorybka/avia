"use client";

import { Suspense } from "react";
import { useParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, FileSpreadsheet, FileUp, GripVertical } from "lucide-react";
import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PROJECT_TABS_NAV, ProjectIcon, ProjectTabs, projectTabs } from "./ProjectHeader";
import { BackToProjectsLink, PaymentTypesHeading, ProjectsHeading } from "./ProjectsHeading";

// Placeholders shaped like each projects screen. The static parts (headings, tab bar, table headers) render for real;
// only what depends on data pulses. Widths vary per row so lists read like text, not a striped block.

const NAME_WIDTHS = ["w-56", "w-40", "w-64", "w-48", "w-36", "w-52"];

/**
 * Fallback for the /projetos access gate, which wraps every projects route: picks the shape from the URL.
 * On /projetos/[id] the URL can't be read while prerendering, so the project shell is the static fallback.
 */
export function ProjectsRouteSkeleton() {
  return (
    <Suspense fallback={<ProjectShellSkeleton />}>
      <ProjectsRouteSkeletonByPath />
    </Suspense>
  );
}

function ProjectsRouteSkeletonByPath() {
  const pathname = usePathname();
  if (pathname === "/projetos") return <ProjectListSkeleton />;
  if (pathname === "/projetos/tipos") return <PaymentTypesSkeleton />;
  return <ProjectShellSkeleton />;
}

export function ProjectListSkeleton() {
  return (
    <LoadingRegion className="space-y-5">
      <ProjectsHeading />
      <div className="space-y-4">
        <div className="flex gap-2 rounded-2xl border border-dashed p-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {NAME_WIDTHS.map((width) => (
            <li key={width} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <SkeletonText className={width} />
                <SkeletonText size="xs" className="w-32" />
              </span>
              <ChevronRight className="size-4 text-muted-foreground/40" />
            </li>
          ))}
        </ul>
      </div>
    </LoadingRegion>
  );
}

/** Header of a project (name still loading, tabs already usable) above the current tab's placeholder. */
export function ProjectShellSkeleton() {
  return (
    <LoadingRegion className="space-y-5">
      <div className="space-y-4">
        <BackToProjectsLink />
        <div className="flex items-center gap-3">
          <ProjectIcon />
          <div className="flex-1">
            <SkeletonText size="2xl" className="w-64 max-w-full" />
          </div>
          <Skeleton className="size-7 rounded-lg" />
        </div>
        <Suspense fallback={<ProjectTabsSkeleton />}>
          <ProjectTabsFromUrl />
        </Suspense>
      </div>
      <Suspense fallback={<TimelineSkeletonBody />}>
        <ProjectTabBodyFromUrl />
      </Suspense>
    </LoadingRegion>
  );
}

function ProjectTabsFromUrl() {
  const { id } = useParams<{ id: string }>();
  return <ProjectTabs projectId={id} />;
}

function ProjectTabsSkeleton() {
  return (
    <nav className={PROJECT_TABS_NAV}>
      {projectTabs("").map((tab) => (
        <span
          key={tab.label}
          className="-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 pb-3 pt-3 text-sm font-medium text-muted-foreground"
        >
          <tab.icon className="size-4" />
          {tab.label}
        </span>
      ))}
    </nav>
  );
}

function ProjectTabBodyFromUrl() {
  const pathname = usePathname();
  if (pathname.endsWith("/rubricas")) return <BudgetItemsSkeletonBody />;
  if (pathname.endsWith("/orcamento")) return <BudgetImportSkeletonBody />;
  return <TimelineSkeletonBody />;
}

/** A segmented control (bg-muted pill group) with the first option selected. */
function SegmentedSkeleton({ widths }: { widths: string[] }) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {widths.map((width, index) => (
        <div key={index} className={cn("h-7 rounded-md", width, index === 0 && "bg-background shadow-sm")} />
      ))}
    </div>
  );
}

// ---------- Linha do tempo ----------

function PaymentRowSkeleton({ title, withBadge = true }: { title: string; withBadge?: boolean }) {
  return (
    <li className="border-l-4 border-l-transparent">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="w-20 shrink-0 pt-0.5">
          <SkeletonText size="xs" className="w-14" />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <SkeletonText className={cn(title, "max-w-full")} />
          <SkeletonText size="xs" className="w-40 max-w-full" />
        </span>
        {withBadge && <Skeleton className="mt-0.5 hidden h-5 w-36 rounded-full sm:block" />}
        <SkeletonText className="w-20" />
        <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground/40" />
      </div>
    </li>
  );
}

function TimelineSkeletonBody() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedSkeleton widths={["w-14", "w-24", "w-24"]} />
          <Skeleton className="ml-auto h-9 w-48 rounded-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-lg sm:w-80" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-52" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-52 rounded-lg" />
        </div>
      </div>
      {[3, 2].map((count, group) => (
        <section key={group} className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <SkeletonText className="w-32" />
            <SkeletonText size="sm" className="w-24" />
          </div>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {NAME_WIDTHS.slice(group * 3, group * 3 + count).map((width) => (
              <PaymentRowSkeleton key={width} title={width} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <LoadingRegion>
      <TimelineSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Rubricas ----------

function BudgetTotalsSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:flex-1">
          <div className="size-24 shrink-0 animate-pulse rounded-full border-[10px] border-foreground/10" />
          <div className="min-w-0 space-y-1">
            <SkeletonText size="sm" className="w-28" />
            <SkeletonText size="4xl" className="w-52 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t pt-4 sm:w-72 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          {["w-14", "w-10"].map((label) => (
            <div key={label}>
              <SkeletonText size="xs" className={label} />
              <SkeletonText className="w-24" />
            </div>
          ))}
          <div className="col-span-2 space-y-1">
            <Skeleton className="h-2 w-full rounded-full" />
            <SkeletonText size="xs" className="w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetItemsSkeletonBody() {
  return (
    <div className="space-y-4">
      <BudgetTotalsSkeleton />
      <div className="flex items-center gap-2 rounded-xl border px-4 py-2">
        <Skeleton className="size-4 rounded-full" />
        <SkeletonText size="sm" className="w-64 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedSkeleton widths={["w-16", "w-24", "w-24", "w-20"]} />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-48 rounded-lg" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Rubrica</TableHead>
              <TableHead className="text-right">Previsto</TableHead>
              <TableHead className="text-right">Pago</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="hidden w-32 md:table-cell" />
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {NAME_WIDTHS.map((width) => (
              <TableRow key={width} className="hover:bg-transparent">
                <TableCell className="pl-4">
                  <SkeletonText className={cn(width, "max-w-full")} />
                  <SkeletonText size="xs" className="w-24" />
                </TableCell>
                {["w-20", "w-20", "w-20"].map((amount, index) => (
                  <TableCell key={index}>
                    <SkeletonText size="sm" className={cn(amount, "ml-auto")} />
                  </TableCell>
                ))}
                <TableCell className="hidden md:table-cell">
                  <Skeleton className="h-1.5 w-full min-w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <ChevronDown className="size-4 text-muted-foreground/40" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell className="pl-4">Total</TableCell>
              {[0, 1, 2].map((index) => (
                <TableCell key={index}>
                  <SkeletonText size="sm" className="ml-auto w-24" />
                </TableCell>
              ))}
              <TableCell className="hidden md:table-cell" />
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

export function BudgetItemsSkeleton() {
  return (
    <LoadingRegion>
      <BudgetItemsSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Orçamento ----------

function BudgetImportSkeletonBody() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8">
        <FileUp className="size-8 text-muted-foreground/40" />
        <div className="flex flex-col items-center">
          <SkeletonText className="w-72 max-w-full" />
          <SkeletonText size="sm" className="w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <section className="space-y-2">
        <SkeletonText size="sm" className="w-32" />
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {["w-72", "w-60"].map((width) => (
            <li key={width} className="flex items-center gap-3 px-4 py-2.5">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground/40" />
              <span className="min-w-0 flex-1">
                <SkeletonText size="sm" className={cn(width, "max-w-full")} />
                <SkeletonText size="xs" className="w-28" />
              </span>
              <Skeleton className="size-7 rounded-lg" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function BudgetImportSkeleton() {
  return (
    <LoadingRegion>
      <BudgetImportSkeletonBody />
    </LoadingRegion>
  );
}

// ---------- Tipos de pagamento ----------

function PaymentTypeCardSkeleton({ name, rows }: { name: string; rows: string[] }) {
  return (
    <article className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <GripVertical className="mx-1.5 size-4 text-muted-foreground/40" />
        <div className="min-w-40 flex-1">
          <SkeletonText size="lg" className={name} />
        </div>
        <Skeleton className="h-[1.15rem] w-8 rounded-full" />
        <SkeletonText size="xs" className="w-24" />
        <Skeleton className="size-7 rounded-lg" />
      </div>
      <div className="space-y-3 p-4">
        <SkeletonText size="xs" className="w-36" />
        <ul className="divide-y">
          {rows.map((width) => (
            <li key={width} className="flex items-center gap-2 py-1.5">
              <GripVertical className="mx-1.5 size-4 text-muted-foreground/40" />
              <div className="min-w-40 flex-1">
                <SkeletonText size="sm" className={width} />
              </div>
              <Skeleton className="h-[1.15rem] w-8 rounded-full" />
              <SkeletonText size="xs" className="w-32" />
              <Skeleton className="size-7 rounded-lg" />
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
    </article>
  );
}

export function PaymentTypesSkeleton() {
  return (
    <LoadingRegion className="space-y-5">
      <PaymentTypesHeading />
      <div className="space-y-4">
        <div className="space-y-1">
          <SkeletonText size="sm" className="w-full" />
          <SkeletonText size="sm" className="w-2/3" />
        </div>
        <div className="flex gap-2 rounded-2xl border border-dashed p-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <PaymentTypeCardSkeleton name="w-36" rows={["w-28", "w-40", "w-32"]} />
          <PaymentTypeCardSkeleton name="w-44" rows={["w-36", "w-24"]} />
        </div>
      </div>
    </LoadingRegion>
  );
}
