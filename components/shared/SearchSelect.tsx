"use client";

import { useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Extra text shown after the label (and searchable), e.g. "fora do orçamento" */
  hint?: string;
};

type FocusAfterClose = "trigger" | "next" | "previous" | "none";

const FOCUSABLE =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Moves focus to the field before/after `from`, within its dialog or form. */
function focusSibling(from: HTMLElement | null, step: 1 | -1) {
  if (!from) return;
  const scope = from.closest('[role="dialog"]') ?? from.closest("form") ?? document.body;
  const fields = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => element === from || element.offsetParent !== null
  );
  (fields[fields.indexOf(from) + step] ?? from).focus();
}

function optionText(option: SearchSelectOption) {
  return `${option.label} ${option.hint ?? ""}`;
}

/**
 * Select with a search box: typing filters by any part of the text (see matchesSearch).
 * Keyboard flow like a text field: Tab into it opens the search, typing a letter on the
 * closed field starts the search with it, Tab inside picks the highlighted option (if
 * something was typed) and moves on. Keeps the given order (for budget items, the spreadsheet's).
 */
export function SearchSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Digite para buscar…",
  emptyText = "Nada encontrado.",
  invalid,
}: {
  id?: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusAfterClose = useRef<FocusAfterClose>("trigger");
  // Focus coming back to the trigger after closing must not reopen it
  const skipNextFocusOpen = useRef(false);

  const selected = options.find((option) => option.value === value);
  const visible = options.filter((option) => matchesSearch(optionText(option), query));

  const updateQuery = (next: string) => {
    setQuery(next);
    setHighlighted(options.find((option) => matchesSearch(optionText(option), next))?.value ?? "");
  };

  const openWith = (initialQuery: string) => {
    updateQuery(initialQuery);
    if (!initialQuery) setHighlighted(value || options[0]?.value || "");
    setOpen(true);
  };

  const close = (focus: FocusAfterClose) => {
    focusAfterClose.current = focus;
    setOpen(false);
  };

  const choose = (optionValue: string, focus: FocusAfterClose) => {
    onChange(optionValue);
    close(focus);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) openWith("");
        else close(focusAfterClose.current);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className="w-full justify-between bg-background font-normal"
          onFocus={(event) => {
            if (skipNextFocusOpen.current) {
              skipNextFocusOpen.current = false;
              return;
            }
            // Keyboard focus (Tab) opens; a mouse click opens through the normal toggle instead
            if (!open && event.currentTarget.matches(":focus-visible")) openWith("");
          }}
          onKeyDown={(event) => {
            if (open || event.ctrlKey || event.metaKey || event.altKey) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              openWith("");
            } else if (event.key.length === 1 && event.key !== " ") {
              event.preventDefault();
              openWith(event.key);
            }
          }}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
            {selected?.hint && <span className="text-muted-foreground"> ({selected.hint})</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        align="start"
        onInteractOutside={() => {
          // Clicked somewhere else: leave focus where the click put it
          focusAfterClose.current = "none";
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const focus = focusAfterClose.current;
          focusAfterClose.current = "trigger";
          setQuery("");
          if (focus === "trigger") {
            skipNextFocusOpen.current = true;
            triggerRef.current?.focus();
          } else if (focus === "next" || focus === "previous") {
            focusSibling(triggerRef.current, focus === "next" ? 1 : -1);
          }
        }}
      >
        {/* Filtering is ours (substring, accent-insensitive); cmdk only handles keyboard navigation */}
        <Command shouldFilter={false} value={highlighted} onValueChange={setHighlighted}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={updateQuery}
            autoComplete="off"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              event.preventDefault();
              const focus = event.shiftKey ? "previous" : "next";
              const pick = query.trim() ? visible.find((option) => option.value === highlighted) : undefined;
              if (pick) choose(pick.value, focus);
              else close(focus);
            }}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {visible.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => choose(option.value, "trigger")}>
                  <Check className={cn("size-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} />
                  <span>
                    {option.label}
                    {option.hint && <span className="text-muted-foreground"> ({option.hint})</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
