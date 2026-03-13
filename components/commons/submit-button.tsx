"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  label?: string;
  loadingLabel?: string;
  className?: string;
}

export function SubmitButton({
  label = "Salvar",
  loadingLabel = "Salvando...",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {pending ? loadingLabel : label}
    </Button>
  );
}
