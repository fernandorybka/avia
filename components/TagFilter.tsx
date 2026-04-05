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
      <span className="text-sm font-medium text-slate-500 mr-2">Filtrar por:</span>
      <div className="flex flex-wrap gap-2">
        {safeAvailableTags.map((tag) => {
          const isSelected = safeSelectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all px-3 py-1 flex items-center gap-1",
                isSelected 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent" 
                  : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 group"
              )}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
              {isSelected && (
                <X className="w-3 h-3 hover:text-white" />
              )}
            </Badge>
          );
        })}
      </div>
      {selectedTags.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-slate-400 hover:text-slate-600 text-xs px-2"
          onClick={onClear}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
