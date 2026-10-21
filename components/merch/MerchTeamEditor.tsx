"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMerchMemberAction, removeMerchMemberAction } from "@/services/merch-member-actions";
import { ConfirmDeleteButton } from "./shared";

type Member = { id: string; email: string };

export function MerchTeamEditor({ members }: { members: Member[] }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Quem estiver nesta lista pode vender e editar o estoque, mas não acessa o resto do admin. Admins
        sempre têm acesso. A pessoa precisa entrar no avia com este mesmo e-mail.
      </p>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addMerchMemberAction(email);
            if (result.ok) {
              toast.success(`${email.trim()} adicionado`);
              setEmail("");
            } else {
              toast.error(result.error);
            }
          });
        }}
      >
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@exemplo.com"
          autoComplete="off"
          required
        />
        <Button type="submit" size="lg" disabled={pending || !email.trim()}>
          <UserPlus />
          Adicionar
        </Button>
      </form>

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          Ninguém além dos admins ainda.
        </p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-foreground">{member.email}</span>
              <ConfirmDeleteButton
                label="Remover da equipe"
                onConfirm={() =>
                  startTransition(async () => {
                    const result = await removeMerchMemberAction(member.id);
                    if (!result.ok) toast.error(result.error);
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
