"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchSelect } from "@/components/shared/SearchSelect";
import { centsToInput, formatCents, parseAmountToCents } from "@/lib/money";
import { balanceAfterPayment, MAX_AMOUNT_CENTS, todayIso } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { createPaymentAction, updatePaymentAction } from "@/services/project-actions";
import type { BudgetItemView, PaymentTypeView, PaymentView } from "@/services/project-services";

const NO_BUDGET_ITEM = "none";

const formSchema = z.object({
  paymentTypeId: z.string().min(1, "Escolha o tipo."),
  budgetItemId: z.string(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  amount: z.string().refine((value) => {
    const cents = parseAmountToCents(value);
    return cents !== null && cents > 0 && cents <= MAX_AMOUNT_CENTS;
  }, "Informe um valor válido (ex.: 1.234,56)."),
  payee: z.string().trim().min(1, "Informe o favorecido.").max(200, "Favorecido muito longo."),
  comment: z.string().max(2000, "Comentário muito longo."),
  confirmOverBudget: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function PaymentDialog({
  projectId,
  items,
  types,
  payment,
  defaultBudgetItemId,
  trigger,
  onCreated,
}: {
  projectId: string;
  items: BudgetItemView[];
  types: PaymentTypeView[];
  payment?: PaymentView;
  defaultBudgetItemId?: string;
  trigger: React.ReactNode;
  /** Called with the new payment so the list can show it open, ready for its checklist */
  onCreated?: (payment: { id: string; budgetItemId: string | null }) => void;
}) {
  // react-hook-form reports errors by mutating formState; the React Compiler's memoization can
  // skip those re-renders, leaving the submit blocked with no message on screen
  "use no memo";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const selectableTypes = types.filter((type) => !type.archived || type.id === payment?.paymentTypeId);

  const defaults = (): FormValues => ({
    paymentTypeId: payment?.paymentTypeId ?? selectableTypes[0]?.id ?? "",
    budgetItemId: payment ? (payment.budgetItemId ?? NO_BUDGET_ITEM) : (defaultBudgetItemId ?? ""),
    paymentDate: payment?.paymentDate ?? todayIso(),
    amount: payment ? centsToInput(payment.amountCents) : "",
    payee: payment?.payee ?? "",
    comment: payment?.comment ?? "",
    confirmOverBudget: false,
  });

  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults(),
  });

  const [typeId, budgetItemId, amount] = useWatch({ control, name: ["paymentTypeId", "budgetItemId", "amount"] });
  const selectedType = types.find((type) => type.id === typeId);
  const selectedItem = items.find((item) => item.id === budgetItemId);
  const amountCents = parseAmountToCents(amount) ?? 0;
  const balanceAfter = selectedItem
    ? balanceAfterPayment({
        plannedCents: selectedItem.plannedCents,
        paidCents: selectedItem.paidCents,
        amountCents,
        previousAmountCents: payment && payment.budgetItemId === selectedItem.id ? payment.amountCents : 0,
      })
    : null;
  const overBudget = balanceAfter !== null && balanceAfter < 0;

  const onSubmit = (values: FormValues) => {
    const noItem = values.budgetItemId === NO_BUDGET_ITEM || values.budgetItemId === "";
    if (noItem && !selectedType?.budgetItemOptional) {
      setError("budgetItemId", { message: "Escolha a rubrica." });
      return;
    }
    if (overBudget && !values.confirmOverBudget) {
      setError("confirmOverBudget", { message: "Confirme que o pagamento ultrapassa o saldo." });
      return;
    }

    const input = {
      paymentTypeId: values.paymentTypeId,
      budgetItemId: noItem ? null : values.budgetItemId,
      paymentDate: values.paymentDate,
      amountCents: parseAmountToCents(values.amount) ?? 0,
      payee: values.payee,
      comment: values.comment,
      confirmOverBudget: values.confirmOverBudget,
    };

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof createPaymentAction>> | Awaited<ReturnType<typeof updatePaymentAction>>;
      try {
        result = payment
          ? await updatePaymentAction(projectId, payment.id, input)
          : await createPaymentAction(projectId, input);
      } catch {
        toast.error("Não foi possível falar com o servidor. Confira a conexão e tente de novo.");
        return;
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(payment ? "Pagamento atualizado" : "Pagamento registrado");
      setOpen(false);
      if (!payment && result.data) onCreated?.({ id: result.data.id, budgetItemId: input.budgetItemId });
    });
  };

  // Never fail silently: say which field is blocking the submit
  const onInvalid = (invalid: typeof errors) => {
    const first = Object.values(invalid).find((error) => error?.message);
    toast.error(first?.message ? String(first.message) : "Confira os campos do pagamento.");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(defaults());
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{payment ? "Editar pagamento" : "Registrar pagamento"}</DialogTitle>
          <DialogDescription>A documentação é marcada depois, no próprio pagamento.</DialogDescription>
        </DialogHeader>

        <form id="payment-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <div className="space-y-1.5">
            <Label htmlFor="payment-date">Data</Label>
            <Input id="payment-date" type="date" {...register("paymentDate")} aria-invalid={!!errors.paymentDate} />
            {errors.paymentDate && <p className="text-xs text-destructive">{errors.paymentDate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">Valor (R$)</Label>
            <Input
              id="payment-amount"
              inputMode="decimal"
              placeholder="0,00"
              {...register("amount")}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-type">Tipo</Label>
            <Controller
              control={control}
              name="paymentTypeId"
              render={({ field }) => (
                <SearchSelect
                  id="payment-type"
                  value={field.value}
                  onChange={field.onChange}
                  options={selectableTypes.map((type) => ({ value: type.id, label: type.name }))}
                  placeholder="Escolha o tipo"
                  emptyText="Nenhum tipo encontrado."
                  invalid={!!errors.paymentTypeId}
                />
              )}
            />
            {errors.paymentTypeId && <p className="text-xs text-destructive">{errors.paymentTypeId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-budget-item">Rubrica</Label>
            <Controller
              control={control}
              name="budgetItemId"
              render={({ field }) => (
                <SearchSelect
                  id="payment-budget-item"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    ...(selectedType?.budgetItemOptional ? [{ value: NO_BUDGET_ITEM, label: "Sem rubrica" }] : []),
                    ...items.map((item) => ({
                      value: item.id,
                      label: item.label,
                      hint: item.status === "out_of_budget" ? "fora do orçamento" : undefined,
                    })),
                  ]}
                  placeholder="Escolha a rubrica"
                  searchPlaceholder="Digite parte do nome ou o número…"
                  emptyText="Nenhuma rubrica encontrada."
                  invalid={!!errors.budgetItemId}
                />
              )}
            />
            {errors.budgetItemId && <p className="text-xs text-destructive">{errors.budgetItemId.message}</p>}
          </div>

          {selectedItem && balanceAfter !== null && (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm sm:col-span-2",
                overBudget ? "bg-destructive/10 text-destructive" : "bg-muted/60 text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span>Saldo da rubrica após este pagamento</span>
                <span className="font-semibold tabular-nums">{formatCents(balanceAfter)}</span>
              </div>
              {overBudget && (
                <label className="mt-2 flex items-start gap-2">
                  <input type="checkbox" className="mt-0.5 size-4 accent-current" {...register("confirmOverBudget")} />
                  <span className="flex items-start gap-1">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Confirmo que este pagamento ultrapassa o saldo da rubrica.
                  </span>
                </label>
              )}
              {errors.confirmOverBudget && <p className="mt-1 text-xs">{errors.confirmOverBudget.message}</p>}
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="payment-payee">Favorecido</Label>
            <Input id="payment-payee" maxLength={200} autoComplete="off" {...register("payee")} aria-invalid={!!errors.payee} />
            {errors.payee && <p className="text-xs text-destructive">{errors.payee.message}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="payment-comment">Comentário</Label>
            <Textarea id="payment-comment" rows={3} maxLength={2000} {...register("comment")} />
            {errors.comment && <p className="text-xs text-destructive">{errors.comment.message}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button type="submit" form="payment-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? (payment ? "Salvando…" : "Registrando…") : payment ? "Salvar" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
