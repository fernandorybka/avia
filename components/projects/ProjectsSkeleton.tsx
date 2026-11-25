/** Placeholder while project data streams in (Suspense fallback / loading.tsx). */
export function ProjectsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      <div className="h-10 w-full animate-pulse rounded-xl bg-muted" />
      <div className="divide-y overflow-hidden rounded-2xl border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
