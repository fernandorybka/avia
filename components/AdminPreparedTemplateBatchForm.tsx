"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deletePreparedTemplateInlineAction,
  publishPreparedTemplateBatchAction,
  setPreparedTemplateVisibilityInlineAction,
  suggestPreparedTemplateBatchAction,
} from "@/services/prepared-template-actions";
import { getCanonicalWildcardKeys } from "@/lib/wildcard-catalog";
import { useRouter } from "next/navigation";
import { PreparedTemplateDownloadButton } from "@/components/PreparedTemplateDownloadButton";

type BatchSuggestion = {
  slot: number;
  fieldKey: string;
  confidence: number;
  reason?: string;
  context: string;
  keepBlank: boolean;
};

type BatchItem = {
  index: number;
  originalFilename: string;
  name: string;
  suggestions: BatchSuggestion[];
  error?: string;
};

type PublishedBatchItem = {
  id: string;
  name: string;
  file: string;
  isPublic: boolean;
};

const KEEP_BLANK_SLOT_TOKEN = "__KEEP_BLANK__";

type Props = {
  categoryPaths: string[];
};

export function AdminPreparedTemplateBatchForm({ categoryPaths }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [categoryPath, setCategoryPath] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedItems, setPublishedItems] = useState<PublishedBatchItem[]>([]);
  const [processingItemId, setProcessingItemId] = useState<string | null>(null);

  const canonicalKeys = useMemo(() => getCanonicalWildcardKeys(), []);
  const hasItemErrors = items.some((item) => Boolean(item.error));

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError("Selecione ao menos um arquivo .docx.");
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);
    setError(null);
    setPublishedItems([]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const result = await suggestPreparedTemplateBatchAction(formData);

      const nextItems = result.items
        .sort((a, b) => a.index - b.index)
        .map((item) => ({
          index: item.index,
          originalFilename: item.originalFilename,
          name: item.suggestedName || item.originalFilename.replace(/\.docx$/i, ""),
          suggestions: item.suggestions.map((s) => ({ ...s, keepBlank: false })),
          error: item.error,
        }));

      setItems(nextItems);
      setMessage("Análise concluída. Revise os campos e publique em lote.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao analisar lote.";
      setError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateItemName = (index: number, value: string) => {
    setItems((prev) => prev.map((item) => (item.index === index ? { ...item, name: value } : item)));
  };

  const updateSuggestionField = (index: number, slot: number, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.index === index
          ? {
              ...item,
              suggestions: item.suggestions.map((s) => (s.slot === slot ? { ...s, fieldKey: value } : s)),
            }
          : item
      )
    );
  };

  const updateSuggestionKeepBlank = (index: number, slot: number, keepBlank: boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.index === index
          ? {
              ...item,
              suggestions: item.suggestions.map((s) => (s.slot === slot ? { ...s, keepBlank } : s)),
            }
          : item
      )
    );
  };

  const handlePublish = async () => {
    if (items.length === 0) {
      setError("Analise os arquivos antes de publicar.");
      return;
    }
    if (!categoryPath.trim()) {
      setError("Informe a categoria compartilhada para o lote.");
      return;
    }
    if (hasItemErrors) {
      setError("Existem arquivos com erro de análise. Corrija/remova antes de publicar.");
      return;
    }

    setIsPublishing(true);
    setMessage(null);
    setError(null);
    setPublishedItems([]);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      formData.set("categoryPath", categoryPath);
      formData.set(
        "batchPayload",
        JSON.stringify(
          items.map((item) => ({
            index: item.index,
            name: item.name,
            slotFieldKeys: item.suggestions
              .sort((a, b) => a.slot - b.slot)
              .map((s) => (s.keepBlank ? KEEP_BLANK_SLOT_TOKEN : s.fieldKey)),
          }))
        )
      );

      const result = await publishPreparedTemplateBatchAction(formData);
      const summary = `Publicados: ${result.created}. Falhas: ${result.failed}.`;
      const details = result.errors.slice(0, 3).map((entry) => `${entry.file}: ${entry.message}`).join(" | ");
      setMessage(details ? `${summary} ${details}` : summary);
      setPublishedItems(result.createdItems);
      setItems([]);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao publicar lote.";
      setError(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Publicação em lote com IA</h2>
      <p className="text-sm text-muted-foreground">
        Envie múltiplos .docx, analise todos de uma vez, revise os coringas e publique com um único clique.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Arquivos (.docx)</label>
          <input
            type="file"
            accept=".docx"
            multiple
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              setFiles(selected);
              setItems([]);
            }}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />
          <p className="text-xs text-muted-foreground">Selecionados: {files.length}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Categoria (compartilhada no lote)</label>
          <input
            value={categoryPath}
            onChange={(event) => setCategoryPath(event.target.value)}
            maxLength={255}
            list="prepared-template-categories-batch"
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            placeholder="Ex.: Editais > PNAB > 2026"
          />
          <datalist id="prepared-template-categories-batch">
            {categoryPaths.map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing || files.length === 0}>
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando lote...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Analisar todos com IA
            </>
          )}
        </Button>

        <Button type="button" onClick={handlePublish} disabled={isPublishing || items.length === 0 || hasItemErrors}>
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Publicando lote...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Publicar todos
            </>
          )}
        </Button>
      </div>

      {message && <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      {items.length > 0 && publishedItems.length === 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={`${item.index}-${item.originalFilename}`} className="rounded-lg border p-4 space-y-3 bg-muted/10">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-xs text-muted-foreground">Arquivo</p>
                  <p className="text-sm font-medium break-words">{item.originalFilename}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nome do modelo</label>
                  <input
                    value={item.name}
                    onChange={(event) => updateItemName(item.index, event.target.value)}
                    className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>

              {item.error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {item.error}
                </div>
              ) : (
                <div className="space-y-2">
                  {item.suggestions.map((suggestion) => (
                    <div key={`${item.index}-${suggestion.slot}`} className="grid gap-2 md:grid-cols-[90px_1fr_220px] items-center rounded-md border p-3 bg-background">
                      <div className="text-xs font-semibold text-muted-foreground">SLOT {suggestion.slot}</div>
                      <div className="text-xs text-muted-foreground">{suggestion.context || "Sem contexto extraído."}</div>
                      <div className="space-y-1">
                        <input
                          list={`batch-canonical-keys-${item.index}-${suggestion.slot}`}
                          value={suggestion.fieldKey}
                          disabled={suggestion.keepBlank}
                          onChange={(event) => updateSuggestionField(item.index, suggestion.slot, event.target.value)}
                          className="w-full h-9 rounded-md border bg-background px-2 text-xs font-mono disabled:opacity-50"
                        />
                        <datalist id={`batch-canonical-keys-${item.index}-${suggestion.slot}`}>
                          {canonicalKeys.map((key) => (
                            <option key={key} value={key} />
                          ))}
                        </datalist>
                        <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={suggestion.keepBlank}
                            onChange={(event) =>
                              updateSuggestionKeepBlank(item.index, suggestion.slot, event.target.checked)
                            }
                          />
                          Nao transformar em coringa
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {publishedItems.length > 0 && (
        <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
          <h3 className="font-semibold text-foreground">Arquivos publicados (confira e baixe)</h3>
          <div className="space-y-2">
            {publishedItems.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{item.name}</p>
                  <p className="text-xs text-muted-foreground break-words">Origem: {item.file}</p>
                  <p className="text-xs text-muted-foreground">Status: {item.isPublic ? "Publico" : "Oculto"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PreparedTemplateDownloadButton templateId={item.id} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={processingItemId === item.id}
                    onClick={async () => {
                      setError(null);
                      setMessage(null);
                      setProcessingItemId(item.id);
                      try {
                        const result = await setPreparedTemplateVisibilityInlineAction(item.id, !item.isPublic);
                        setPublishedItems((prev) =>
                          prev.map((entry) =>
                            entry.id === item.id ? { ...entry, isPublic: result.isPublic } : entry
                          )
                        );
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Falha ao alterar status.";
                        setError(msg);
                      } finally {
                        setProcessingItemId(null);
                      }
                    }}
                  >
                    {item.isPublic ? "Ocultar" : "Exibir"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={processingItemId === item.id}
                    onClick={async () => {
                      setError(null);
                      setMessage(null);
                      setProcessingItemId(item.id);
                      try {
                        await deletePreparedTemplateInlineAction(item.id);
                        setPublishedItems((prev) => prev.filter((entry) => entry.id !== item.id));
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Falha ao excluir modelo.";
                        setError(msg);
                      } finally {
                        setProcessingItemId(null);
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
