/**
 * Placeholder while a page's per-request data streams in (used by loading.tsx files).
 * `framed` adds the page container for routes whose page draws its own frame.
 */
export function PageSkeleton({ framed = true, rows = 5 }: { framed?: boolean; rows?: number }) {
  const content = (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="flex items-center gap-4">
        <div className="size-12 animate-pulse rounded-xl bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );

  if (!framed) return content;

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-28">
        <div className="max-w-4xl mx-auto">{content}</div>
      </main>
    </div>
  );
}
