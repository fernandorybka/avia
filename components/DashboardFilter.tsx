"use client";

import { TagFilter } from "./TagFilter";
import * as React from "react";

interface DashboardFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function DashboardFilter({ 
  availableTags, 
  selectedTags, 
  onToggleTag, 
  onClear 
}: DashboardFilterProps) {
  return (
    <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onClear={onClear}
      />
    </div>
  );
}
