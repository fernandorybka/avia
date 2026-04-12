"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createPreparedTemplateAction,
  suggestPreparedTemplateSlotsAction,
} from "@/services/prepared-template-actions";
import { getCanonicalWildcardKeys } from "@/lib/wildcard-catalog";

type SuggestionItem = {
  slot: number;
  fieldKey: string;
  confidence: number;
  reason?: string;
  context: string;
  keepBlank: boolean;
};

const KEEP_BLANK_SLOT_TOKEN = "__KEEP_BLANK__";

type Props = {
  categoryPaths: string[];
};

export function AdminPreparedTemplateForm({ categoryPaths }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonicalKeys = useMemo(() => getCanonicalWildcardKeys(), []);

  const updateSuggestion = (slot: number, value: string) => {
    setSuggestions((prev) =>
      prev.map((item) => (item.slot === slot ? { ...item, fieldKey: value } : item))
    );
  };

  const handleSuggest = async () => {
    if (!file) {
      setError("Selecione um arquivo .docx antes de solicitar sugestões.");
      return;
    }

    setIsSuggesting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await suggestPreparedTemplateSlotsAction(formData);
      setSuggestions(result.suggestions.map((item) => ({ ...item, keepBlank: false })));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao sugerir coringas.";
      setError(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <form
      action={async (formData) => {
        setError(null);
        if (file) {
          formData.set("file", file);
        }
        formData.set("preparationMode", mode);
        if (mode === "ai") {
          formData.set(
            "slotFieldKeysJson",
            JSON.stringify(
              suggestions
                .sort((a, b) => a.slot - b.slot)
                .map((item) => (item.keepBlank ? KEEP_BLANK_SLOT_TOKEN : item.fieldKey))
            )
          );
        }

        try {
          await createPreparedTemplateAction(formData);
        } catch (e) {
          if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
            throw e;
          }
          const message = e instanceof Error ? e.message : "Não foi possível publicar o modelo.";
          setError(message);
        }
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nome
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={255}
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          placeholder="Ex.: Contrato padrão de cessão"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="file" className="text-sm font-medium text-foreground">
          Arquivo (.docx)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".docx"
          required
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null;
            setFile(nextFile);
            setSuggestions([]);
          }}
          className="w-full h-10 rounded-md border bg-background px-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="categoryPath" className="text-sm font-medium text-foreground">
          Categoria
        </label>
        <input
          id="categoryPath"
          name="categoryPath"
          required
          maxLength={255}
          list="prepared-template-categories"
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          placeholder="Ex.: Editais > Lei Paulo Gustavo > 2026"
        />
        <datalist id="prepared-template-categories">
          {categoryPaths.map((path) => (
            <option key={path} value={path} />
          ))}
        </datalist>
        <p className="text-xs text-muted-foreground">
          Use &quot;&gt;&quot; para níveis hierárquicos. Você pode escolher uma existente ou criar nova.
        </p>
      </div>

      <div className="space-y-2 md:col-span-2">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Descrição (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          maxLength={1000}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Contexto rápido para quem vai baixar este modelo"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label htmlFor="preparationMode" className="text-sm font-medium text-foreground">
          Modo de preparação
        </label>
        <select
          id="preparationMode"
          name="preparationMode"
          value={mode}
          onChange={(event) => setMode(event.target.value === "ai" ? "ai" : "manual")}
          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="manual">Manual (arquivo já com coringas)</option>
          <option value="ai">IA (documento original com lacunas em _____)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          IA: detecta lacunas com sublinhado e sugere coringas canônicos para reaproveitar cadastros entre modelos.
        </p>
      </div>

      {mode === "ai" && (
        <div className="md:col-span-2 space-y-3 rounded-lg border p-4 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Sugestões de coringas por lacuna</p>
            <Button type="button" variant="outline" onClick={handleSuggest} disabled={isSuggesting}>
              {isSuggesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sugerindo...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Sugerir com IA
                </>
              )}
            </Button>
          </div>

          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Clique em &quot;Sugerir com IA&quot; para preencher automaticamente os nomes de coringas antes de publicar.
            </p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((item) => (
                <div key={item.slot} className="grid gap-2 md:grid-cols-[90px_1fr_220px] items-center border rounded-md p-3 bg-background">
                  <div className="text-xs font-semibold text-muted-foreground">SLOT {item.slot}</div>
                  <div className="text-xs text-muted-foreground">{item.context || "Sem contexto extraído."}</div>
                  <div className="space-y-1">
                    <input
                      list={`canonical-keys-${item.slot}`}
                      value={item.fieldKey}
                      disabled={item.keepBlank}
                      onChange={(event) => updateSuggestion(item.slot, event.target.value)}
                      className="w-full h-9 rounded-md border bg-background px-2 text-xs font-mono disabled:opacity-50"
                    />
                    <datalist id={`canonical-keys-${item.slot}`}>
                      {canonicalKeys.map((key) => (
                        <option key={key} value={key} />
                      ))}
                    </datalist>
                    <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={item.keepBlank}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setSuggestions((prev) =>
                            prev.map((entry) =>
                              entry.slot === item.slot ? { ...entry, keepBlank: checked } : entry
                            )
                          );
                        }}
                      />
                      Nao transformar em coringa (manter linha em branco)
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Confiança: {(item.confidence * 100).toFixed(0)}%{item.reason ? ` - ${item.reason}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="md:col-span-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit">
          <Upload className="w-4 h-4" />
          Publicar modelo pronto
        </Button>
      </div>
    </form>
  );
}
