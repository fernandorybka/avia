"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TagFilter } from "./TagFilter";
import * as React from "react";

interface DashboardFilterProps {
  availableTags: string[];
}

export function DashboardFilter({ availableTags }: DashboardFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedTags = React.useMemo(() => {
    const tags = searchParams.get("tags");
    return tags ? tags.split(",") : [];
  }, [searchParams]);

  const handleToggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    
    const params = new URLSearchParams(searchParams.toString());
    if (newTags.length > 0) {
      params.set("tags", newTags.join(","));
    } else {
      params.delete("tags");
    }
    
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tags");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClear={handleClear}
      />
    </div>
  );
}
