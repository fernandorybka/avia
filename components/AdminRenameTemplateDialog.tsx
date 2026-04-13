"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renamePreparedTemplateAction } from "@/services/prepared-template-actions";
import { toast } from "sonner";

interface AdminRenameTemplateDialogProps {
  templateId: string;
  currentName: string;
}

export function AdminRenameTemplateDialog({
  templateId,
  currentName,
}: AdminRenameTemplateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      await renamePreparedTemplateAction(formData);
      setIsOpen(false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
        throw e;
      }
      toast.error(e instanceof Error ? e.message : "Erro ao renomear modelo.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="w-4 h-4" />
          Editar Nome
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Nome do Modelo</DialogTitle>
          <DialogDescription>
            Alterar o nome exibido para este modelo pronto.
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4 py-4">
          <input type="hidden" name="id" value={templateId} />
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Modelo</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o novo nome..."
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar Alteração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
