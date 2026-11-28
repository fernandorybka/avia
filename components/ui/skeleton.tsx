import { cn } from "@/lib/utils";

/** A pulsing placeholder block. Size and shape come from `className`. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("animate-pulse rounded-md bg-foreground/10", className)} {...props} />;
}

// [line box height, bar height] for each Tailwind text size, so a placeholder line takes the same room as the text it stands for
const TEXT_SIZES = {
  xs: ["h-4", "h-3"],
  sm: ["h-5", "h-3.5"],
  base: ["h-6", "h-4"],
  lg: ["h-7", "h-5"],
  "2xl": ["h-8", "h-6"],
  "3xl": ["h-9", "h-7"],
  "4xl": ["h-10", "h-8"],
} as const;

/** One line of text still loading. `className` sets the bar (width, `ml-auto` to align right). */
export function SkeletonText({
  size = "base",
  className,
}: {
  size?: keyof typeof TEXT_SIZES;
  className?: string;
}) {
  const [line, bar] = TEXT_SIZES[size];
  return (
    <div aria-hidden className={cn("flex items-center", line)}>
      <Skeleton className={cn("rounded", bar, className)} />
    </div>
  );
}

/** Wraps a loading placeholder so assistive tech hears "Carregando" once instead of empty boxes. */
export function LoadingRegion({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}
