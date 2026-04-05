"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function TagFilter({ availableTags, selectedTags, onToggleTag, onClear }: TagFilterProps) {
  const safeAvailableTags = availableTags || [];
  const safeSelectedTags = selectedTags || [];
  
  if (safeAvailableTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-muted-foreground mr-2">Filtrar por:</span>
      <div className="flex flex-wrap gap-2">
        {safeAvailableTags.map((tag) => {
          const isSelected = safeSelectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all px-3 py-1 flex items-center gap-1",
                !isSelected && "hover:bg-muted"
              )}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
              {isSelected && (
                <X className="w-3 h-3" />
              )}
            </Badge>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-muted-foreground hover:text-foreground text-xs px-2"
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
