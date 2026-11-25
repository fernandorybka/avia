"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteButton, EditableCell } from "@/components/shared/editable";
import { cn } from "@/lib/utils";
import {
  addChecklistItemAction,
  createPaymentTypeAction,
  removeChecklistItemAction,
  removePaymentTypeAction,
  reorderChecklistItemsAction,
  reorderPaymentTypesAction,
  restoreChecklistItemAction,
  restorePaymentTypeAction,
  updateChecklistItemAction,
  updatePaymentTypeAction,
} from "@/services/payment-type-actions";
import type { PaymentTypeView } from "@/services/project-services";
import type { ChecklistItem } from "@/lib/projects";

function notify<T extends { ok: boolean; error?: string }>(result: T): T {
  if (!result.ok) toast.error(result.error);
  return result;
}

function useDragSensors() {
  return useSensors(
    // Small distance so a tap on the handle doesn't count as a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

/** New order of ids after a drop, or null if nothing moved. */
function reorderedIds(ids: string[], { active, over }: DragEndEvent): string[] | null {
  if (!over || active.id === over.id) return null;
  const from = ids.indexOf(String(active.id));
  const to = ids.indexOf(String(over.id));
  return from === -1 || to === -1 ? null : arrayMove(ids, from, to);
}

function DragHandle({ label, ...props }: { label: string } & React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function InlineAddForm({
  placeholder,
  maxLength,
  onAdd,
  buttonLabel,
}: {
  placeholder: string;
  maxLength: number;
  onAdd: (value: string) => Promise<{ ok: boolean; error?: string }>;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        startTransition(async () => {
          if (notify(await onAdd(value)).ok) setValue("");
        });
      }}
    >
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} maxLength={maxLength} />
      <Button type="submit" variant="secondary" disabled={pending || !value.trim()}>
        <Plus />
        {buttonLabel}
      </Button>
    </form>
  );
}

function ChecklistItemRow({ item }: { item: ChecklistItem }) {
  const [, startTransition] = useTransition();
  // Only removal dims the row; toggles are optimistic and shouldn't look busy
  const [removing, startRemoving] = useTransition();
  const [allowNotApplicable, setOptimisticAllow] = useOptimistic(item.allowNotApplicable);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex flex-wrap items-center gap-2 bg-card py-1.5",
        isDragging && "z-10 rounded-md shadow-md ring-1 ring-primary/40",
        removing && "opacity-60"
      )}
    >
      <DragHandle label={`Arrastar ${item.label}`} {...attributes} {...listeners} />
      <EditableCell
        value={item.label}
        aria-label="Documento"
        maxLength={150}
        className="min-w-40 flex-1"
        onSave={(label) => updateChecklistItemAction(item.id, { label })}
      />
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Switch
          checked={allowNotApplicable}
          onCheckedChange={(next) =>
            startTransition(async () => {
              setOptimisticAllow(next);
              notify(await updateChecklistItemAction(item.id, { allowNotApplicable: next }));
            })
          }
        />
        Admite “não se aplica”
      </label>
      <ConfirmDeleteButton
        label="Remover documento"
        onConfirm={() =>
          startRemoving(async () => {
            const result = notify(await removeChecklistItemAction(item.id));
            if (result.ok && result.data.archived) toast.info("Documento arquivado: já foi marcado em pagamentos.");
          })
        }
      />
    </li>
  );
}

function ChecklistItemList({ typeId, items }: { typeId: string; items: ChecklistItem[] }) {
  const sensors = useDragSensors();
  const [, startTransition] = useTransition();
  const [ordered, setOptimisticOrder] = useOptimistic(items);
  const ids = ordered.map((item) => item.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={(event) => {
        const next = reorderedIds(ids, event);
        if (!next) return;
        startTransition(async () => {
          setOptimisticOrder(next.map((id) => ordered.find((item) => item.id === id)!));
          notify(await reorderChecklistItemsAction(typeId, next));
        });
      }}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pressione espaço para pegar o documento, use as setas para mover e espaço de novo para soltar.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="divide-y">
          {ordered.map((item) => (
            <ChecklistItemRow key={item.id} item={item} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function PaymentTypeCard({ type }: { type: PaymentTypeView }) {
  const [, startTransition] = useTransition();
  const [busy, startBusy] = useTransition();
  const [showArchived, setShowArchived] = useState(false);
  const [budgetItemOptional, setOptimisticOptional] = useOptimistic(type.budgetItemOptional);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: type.id });
  const activeItems = type.items.filter((item) => !item.archived);
  const archivedItems = type.items.filter((item) => item.archived);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative rounded-2xl border bg-card shadow-sm",
        isDragging && "z-20 shadow-lg ring-1 ring-primary/40",
        busy && "opacity-60"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <DragHandle label={`Arrastar o tipo ${type.name}`} {...attributes} {...listeners} />
        <EditableCell
          value={type.name}
          aria-label="Nome do tipo"
          maxLength={80}
          className="min-w-40 flex-1 text-lg font-semibold"
          onSave={(name) => updatePaymentTypeAction(type.id, { name })}
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch
            checked={budgetItemOptional}
            onCheckedChange={(next) =>
              startTransition(async () => {
                setOptimisticOptional(next);
                notify(await updatePaymentTypeAction(type.id, { budgetItemOptional: next }));
              })
            }
          />
          Rubrica opcional
        </label>
        <ConfirmDeleteButton
          label="Remover tipo"
          onConfirm={() =>
            startBusy(async () => {
              const result = notify(await removePaymentTypeAction(type.id));
              if (result.ok && result.data.archived) toast.info("Tipo arquivado: já há pagamentos com ele.");
            })
          }
        />
      </div>
      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documentação exigida</p>
        {activeItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento: pagamentos deste tipo ficam sempre completos.</p>
        ) : (
          <ChecklistItemList typeId={type.id} items={activeItems} />
        )}
        <InlineAddForm
          placeholder="Novo documento (ex.: Nota fiscal)"
          maxLength={150}
          buttonLabel="Documento"
          onAdd={(label) => addChecklistItemAction(type.id, label)}
        />
        {archivedItems.length > 0 && (
          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={() => setShowArchived((value) => !value)}
            >
              <ChevronDown className={cn("size-3 transition-transform", showArchived && "rotate-180")} />
              {archivedItems.length} documento(s) arquivado(s)
            </button>
            {showArchived && (
              <ul className="mt-2 space-y-1">
                {archivedItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex-1 line-through">{item.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        startBusy(async () => {
                          notify(await restoreChecklistItemAction(item.id));
                        })
                      }
                    >
                      <RotateCcw />
                      Reativar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function PaymentTypesEditor({ types }: { types: PaymentTypeView[] }) {
  const sensors = useDragSensors();
  const [pending, startTransition] = useTransition();
  const [active, setOptimisticActive] = useOptimistic(types.filter((type) => !type.archived));
  const archived = types.filter((type) => type.archived);
  const ids = active.map((type) => type.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Arraste pela alça <GripVertical className="inline size-3.5 align-text-bottom" /> para mudar a ordem. Toque em qualquer
        nome para editar — salva sozinho ao sair do campo. Documentos ou tipos já usados em pagamentos são arquivados em vez
        de apagados, para não perder o que foi marcado.
      </p>
      <div className="rounded-2xl border border-dashed p-3">
        <InlineAddForm placeholder="Novo tipo de pagamento" maxLength={80} buttonLabel="Tipo" onAdd={createPaymentTypeAction} />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const next = reorderedIds(ids, event);
          if (!next) return;
          startTransition(async () => {
            setOptimisticActive(next.map((id) => active.find((type) => type.id === id)!));
            notify(await reorderPaymentTypesAction(next));
          });
        }}
        accessibility={{
          screenReaderInstructions: {
            draggable: "Pressione espaço para pegar o tipo, use as setas para mover e espaço de novo para soltar.",
          },
        }}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid gap-3 lg:grid-cols-2">
            {active.map((type) => (
              <PaymentTypeCard key={type.id} type={type} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {archived.length > 0 && (
        <section className={cn("space-y-2", pending && "opacity-60")}>
          <h2 className="text-sm font-medium text-muted-foreground">Tipos arquivados</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {archived.map((type) => (
              <li key={type.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                <span className="flex-1 text-muted-foreground">{type.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      notify(await restorePaymentTypeAction(type.id));
                    })
                  }
                >
                  <RotateCcw />
                  Reativar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
