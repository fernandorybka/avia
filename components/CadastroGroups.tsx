"use client";

import * as React from "react";
import { Check, ChevronsUpDown, FolderTree, GripVertical, Plus } from "lucide-react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectGroup, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { groupCadastros, NO_GROUP_LABEL, type GroupedItem } from "@/lib/cadastro-groups";

/** Select items for cadastros, grouped by parent level (custom level order, ungrouped last). */
export function GroupedCadastroSelectItems({ items, order }: { items: GroupedItem[]; order?: string[] }) {
  const groups = React.useMemo(() => groupCadastros(items, order), [items, order]);
  // A single "no level" group needs no heading
  const showLabels = groups.some((group) => group.groupName !== null);

  return groups.map((group, index) => (
    <React.Fragment key={group.groupName ?? "__none__"}>
      {index > 0 && <SelectSeparator />}
      <SelectGroup>
        {showLabels && <SelectLabel>{group.groupName ?? NO_GROUP_LABEL}</SelectLabel>}
        {group.items.map((item) => (
          <SelectItem key={item.id} value={item.id} className={cn(showLabels && "pl-4")}>
            {item.name}
          </SelectItem>
        ))}
      </SelectGroup>
    </React.Fragment>
  ));
}

interface GroupPickerProps {
  value: string | null;
  onChange: (groupName: string | null) => void;
  groupNames: string[];
  disabled?: boolean;
  id?: string;
}

/** Pick an existing parent level, type a new one, or clear it. */
export function GroupPicker({ value, onChange, groupNames, disabled, id }: GroupPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const options = React.useMemo(
    () => (value && !groupNames.includes(value) ? [...groupNames, value].sort((a, b) => a.localeCompare(b, "pt-BR")) : groupNames),
    [groupNames, value]
  );

  const select = (groupName: string | null) => {
    const trimmed = groupName?.trim() || null;
    onChange(trimmed);
    setInputValue("");
    setOpen(false);
  };

  const typed = inputValue.trim();
  const canCreate = typed && !options.some((name) => name.localeCompare(typed, "pt-BR", { sensitivity: "base" }) === 0);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-background font-normal"
        >
          <span className={cn("flex items-center gap-2 truncate", !value && "text-muted-foreground")}>
            <FolderTree className="w-4 h-4 shrink-0" />
            {value ?? NO_GROUP_LABEL}
          </span>
          <ChevronsUpDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou criar nível..."
            value={inputValue}
            autoComplete="off"
            onValueChange={setInputValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canCreate) {
                e.preventDefault();
                select(typed);
              }
            }}
          />
          <CommandList>
            {!canCreate && <CommandEmpty>Nenhum nível encontrado.</CommandEmpty>}
            <CommandGroup>
              <CommandItem value={`__none__ ${NO_GROUP_LABEL}`} onSelect={() => select(null)}>
                <Check className={cn("mr-2 h-4 w-4", value === null ? "opacity-100" : "opacity-0")} />
                <span className="text-muted-foreground">{NO_GROUP_LABEL}</span>
              </CommandItem>
              {options.map((name) => (
                <CommandItem key={name} value={name} onSelect={() => select(name)}>
                  <Check className={cn("mr-2 h-4 w-4", value === name ? "opacity-100" : "opacity-0")} />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
            {canCreate && (
              <CommandGroup forceMount>
                <CommandItem forceMount value={`__create__ ${typed}`} onSelect={() => select(typed)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar &quot;{typed}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface GroupOrderEditorProps {
  groupNames: string[]; // already in display order
  onChange: (groupNames: string[]) => void;
  disabled?: boolean;
}

/** Drag levels (mouse, touch or keyboard) to set the order they appear in the cadastro lists. */
export function GroupOrderEditor({ groupNames, onChange, disabled }: GroupOrderEditorProps) {
  const sensors = useSensors(
    // Small distance so a tap on the handle doesn't count as a drag
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = groupNames.indexOf(String(active.id));
    const to = groupNames.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onChange(arrayMove(groupNames, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pressione espaço para pegar o nível, use as setas para mover e espaço de novo para soltar.",
        },
      }}
    >
      <SortableContext items={groupNames} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ol className="space-y-1">
          {groupNames.map((name, index) => (
            <SortableGroupRow key={name} name={name} position={index + 1} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableGroupRow({ name, position }: { name: string; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5 text-sm",
        isDragging && "z-10 shadow-md ring-1 ring-primary/40"
      )}
    >
      <button
        type="button"
        aria-label={`Arrastar ${name}`}
        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{position}</span>
      <span className="flex-1 truncate">{name}</span>
    </li>
  );
}
