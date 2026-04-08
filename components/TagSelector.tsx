"use client";

import * as React from "react";
import { X, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  allAvailableTags: string[];
}

export function TagSelector({ selectedTags, onChange, allAvailableTags }: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag || selectedTags.includes(trimmedTag)) return;

    const newTags = [...selectedTags, trimmedTag];
    onChange(newTags);
    setInputValue("");
    setOpen(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter((t) => t !== tagToRemove);
    onChange(newTags);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {selectedTags.map((tag) => (
        <Badge key={tag} variant="secondary" className="px-2 py-1 gap-1 group">
          {tag}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag)}
            className="hover:bg-muted rounded-full p-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Etiqueta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Pesquisar etiqueta..." 
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue) {
                  e.preventDefault();
                  handleAddTag(inputValue);
                }
              }}
            />
            <CommandList>
              <CommandEmpty>
                <div 
                  className="p-2 cursor-pointer hover:bg-muted flex items-center justify-between text-sm"
                  onClick={() => handleAddTag(inputValue)}
                >
                  Criar "{inputValue}"
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </div>
              </CommandEmpty>
              <CommandGroup>
                {(allAvailableTags || [])
                  .filter((tag) => !(selectedTags || []).includes(tag))
                  .map((tag) => (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => handleAddTag(tag)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          (selectedTags || []).includes(tag) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {tag}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
