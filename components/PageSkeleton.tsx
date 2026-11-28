import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Placeholders for the full-page routes (admin, cadastros, modelo), used by their loading.tsx files.
// Each draws the same frame, width and heading as its page so nothing jumps when the content arrives.

const WIDTHS = { "4xl": "max-w-4xl", "6xl": "max-w-6xl" } as const;

function PageFrame({
  width,
  heading = true,
  children,
}: {
  width?: keyof typeof WIDTHS;
  heading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <LoadingRegion className={cn(width && "mx-auto space-y-8", width && WIDTHS[width])}>
          {heading && (
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-xl" />
              <div className="space-y-1">
                <SkeletonText size="3xl" className="w-64 max-w-full" />
                <SkeletonText className="w-96 max-w-full" />
              </div>
            </div>
          )}
          {children}
        </LoadingRegion>
      </main>
    </div>
  );
}

/** A labelled input, as in the admin and generation forms. */
function FieldSkeleton({ label = "w-24" }: { label?: string }) {
  return (
    <div className="space-y-2">
      <SkeletonText size="sm" className={label} />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  );
}

function TableSkeleton({ columns, rows = 6, toolbar = false }: { columns: string[]; rows?: number; toolbar?: boolean }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-4 py-3">
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-7 w-36 rounded-lg" />
        </div>
      )}
      <div className="flex gap-4 border-b px-4 py-3">
        {columns.map((width, index) => (
          <div key={index} className={width}>
            <SkeletonText size="sm" className="w-16" />
          </div>
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3">
            {columns.map((width, index) => (
              <div key={index} className={width}>
                <SkeletonText size="sm" className={row % 2 ? "w-2/3" : "w-4/5"} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function FormCardSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <SkeletonText size="lg" className="w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <FieldSkeleton key={index} label={index % 2 ? "w-20" : "w-28"} />
        ))}
      </div>
      <Skeleton className="h-9 w-40 rounded-lg" />
    </section>
  );
}

export function AdminHomeSkeleton() {
  return (
    <PageFrame width="4xl">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["w-24", "w-40", "w-48", "w-40"].map((title, index) => (
          <div key={index} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
            <Skeleton className="size-10 rounded-lg" />
            <SkeletonText size="lg" className={title} />
            <div>
              <SkeletonText size="sm" className="w-full" />
              <SkeletonText size="sm" className="w-3/4" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
          </div>
        ))}
      </section>
    </PageFrame>
  );
}

export function AdminPreparedTemplatesSkeleton() {
  return (
    <PageFrame width="6xl">
      <FormCardSkeleton />
      <TableSkeleton toolbar columns={["w-[6%]", "w-[24%]", "w-[25%]", "w-[12%]", "w-[13%]", "w-[20%]"]} />
    </PageFrame>
  );
}

export function AdminCategoriesSkeleton() {
  return (
    <PageFrame width="6xl">
      <FormCardSkeleton fields={2} />
      <TableSkeleton columns={["flex-1", "w-28", "flex-1", "w-20"]} />
    </PageFrame>
  );
}

export function AdminBatchSkeleton() {
  return (
    <PageFrame width="6xl">
      <section className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <SkeletonText size="lg" className="w-56" />
        <div className="grid gap-4 md:grid-cols-2">
          <FieldSkeleton label="w-32" />
          <FieldSkeleton label="w-24" />
        </div>
        <Skeleton className="h-32 rounded-xl border-2 border-dashed border-muted bg-transparent" />
        <Skeleton className="h-9 w-44 rounded-lg" />
      </section>
    </PageFrame>
  );
}

/** Pessoas & Dados: record picker above the selected record's card. */
export function CadastrosSkeleton() {
  return (
    <PageFrame width="6xl">
      <div className="space-y-6">
        <div className="mx-auto max-w-md space-y-2 rounded-xl border bg-muted/50 p-4">
          <SkeletonText size="sm" className="w-36" />
          <Skeleton className="h-10 rounded-lg bg-background" />
        </div>
        <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-4">
            <div className="space-y-2">
              <SkeletonText size="lg" className="w-48" />
              <SkeletonText size="xs" className="w-56" />
            </div>
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <div className="divide-y px-4">
            {["w-28", "w-20", "w-32", "w-24", "w-28"].map((label, index) => (
              <div key={index} className="flex items-center justify-between gap-4 py-3">
                <SkeletonText size="sm" className={label} />
                <SkeletonText size="sm" className={index % 2 ? "w-40" : "w-52"} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

/** Document generation form (TemplateForm): saved-data picker, then the template's fields. */
export function TemplateFormSkeleton() {
  return (
    <PageFrame heading={false}>
      <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-foreground/10">
        <div className="space-y-2 border-b bg-muted/50 px-4 py-4">
          <SkeletonText size="2xl" className="w-64 max-w-full" />
          <SkeletonText size="sm" className="w-80 max-w-full" />
        </div>
        <div className="space-y-8 p-4 pt-6">
          <div className="space-y-4 rounded-xl border bg-muted/50 p-4">
            <FieldSkeleton label="w-36" />
            <FieldSkeleton label="w-12" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {["w-24", "w-32", "w-20", "w-28", "w-36", "w-24"].map((label, index) => (
              <FieldSkeleton key={index} label={label} />
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </PageFrame>
  );
}
