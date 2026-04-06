"use client";

import { useState, useMemo } from "react";
import { DashboardFilter } from "./DashboardFilter";
import { TemplateCard } from "./TemplateCard";
import { UploadTemplate } from "./UploadTemplate";
import { FileText } from "lucide-react";

interface Template {
  id: string;
  name: string;
  slug: string;
  userId: string;
  createdAt: Date;
  tags: string[] | null;
  content: string | null;
  storageUrl: string | null;
}

interface DashboardContainerProps {
  initialTemplates: Template[];
  allAvailableTags: string[];
}

export function DashboardContainer({ 
  initialTemplates, 
  allAvailableTags 
}: DashboardContainerProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClear = () => {
    setSelectedTags([]);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredTemplates = useMemo(() => {
    if (selectedTags.length === 0) return templates;
    return templates.filter((template) =>
      selectedTags.some((tag) => (template.tags || []).includes(tag))
    );
  }, [templates, selectedTags]);

  return (
    <div className="space-y-8">
      <DashboardFilter
        availableTags={allAvailableTags}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClear={handleClear}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UploadTemplate />
        {filteredTemplates.length === 0 && selectedTags.length > 0 ? (
          <div className="sm:col-span-1 p-8 text-center space-y-4 border rounded-xl bg-card shadow-sm flex flex-col items-center justify-center">
            <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhum modelo com estas tags.</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={{
                ...template,
                tags: template.tags || [] // Ensure tags is string[]
              }}
              allAvailableTags={allAvailableTags}
              onDelete={handleDeleteTemplate}
            />
          ))
        )}
      </div>
    </div>
  );
}
