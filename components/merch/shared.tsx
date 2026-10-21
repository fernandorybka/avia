"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Swatch({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full ring-1 ring-foreground/15 shadow-inner", className)}
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Spreadsheet-like cell: edit in place, saves on blur or Enter, reverts if the save fails.
 * Remounts (via key) whenever the saved value changes on the server.
 */
export function EditableCell({
  value,
  onSave,
  className,
  ...props
}: {
  value: string;
  onSave: (next: string) => Promise<{ ok: boolean; error?: string }>;
} & Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onBlur">) {
  return <EditableCellInner key={value} value={value} onSave={onSave} className={className} {...props} />;
}

function EditableCellInner({
  value,
  onSave,
  className,
  ...props
}: {
  value: string;
  onSave: (next: string) => Promise<{ ok: boolean; error?: string }>;
} & Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onBlur">) {
  const [saving, setSaving] = useState(false);

  return (
    <input
      defaultValue={value}
      disabled={saving}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          event.currentTarget.value = value;
          event.currentTarget.blur();
        }
      }}
      onBlur={async (event) => {
        const input = event.currentTarget;
        const next = input.value.trim();
        if (next === value) return;
        setSaving(true);
        const result = await onSave(next);
        setSaving(false);
        if (!result.ok) {
          toast.error(result.error ?? "Não foi possível salvar.");
          input.value = value;
        }
      }}
      className={cn(
        "min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 outline-none transition-colors",
        "hover:border-border focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

/** Delete button that asks for a second tap instead of opening a browser dialog. */
export function ConfirmDeleteButton({
  onConfirm,
  label = "Excluir",
  className,
}: {
  onConfirm: () => void;
  label?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        className={cn("text-muted-foreground hover:text-destructive", className)}
        onClick={() => {
          setArmed(true);
          timer.current = window.setTimeout(() => setArmed(false), 3000);
        }}
      >
        <Trash2 />
      </Button>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className={className}
      onClick={() => {
        window.clearTimeout(timer.current);
        setArmed(false);
        onConfirm();
      }}
    >
      Confirmar
    </Button>
  );
}
