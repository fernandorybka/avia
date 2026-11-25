"use client";

import { cn } from "@/lib/utils";

export { ConfirmDeleteButton, EditableCell } from "@/components/shared/editable";

export function Swatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full ring-1 ring-foreground/15 shadow-inner", className)}
      style={{ backgroundColor: color }}
    />
  );
}
