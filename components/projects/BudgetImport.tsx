"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Download, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  applyMapping,
  columnLetter,
  guessMapping,
  isValidMapping,
  selectIncludedItems,
  type ColumnMapping,
  type SheetData,
} from "@/lib/budget-mapping";
import { linksByRowToIndexes, matchBudgetItems, type CurrentBudgetItem } from "@/lib/budget-diff";
import { formatCents } from "@/lib/money";
import { formatBudgetItemLabel } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { applyBudgetVersionAction, uploadBudgetFileAction } from "@/services/project-actions";
import type { BudgetPageData } from "@/services/project-services";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const NONE = "none";

type Draft = { versionId: string; sheets: SheetData[] };
type PartialMapping = { code: number | null; name: number | null; amount: number | null };

function initialMapping(sheet: SheetData, last: BudgetPageData["lastMapping"]): PartialMapping {
  if (last?.mapping && isValidMapping(last.mapping, sheet.header.length)) return last.mapping;
  const guess = guessMapping(sheet.header);
  return { code: guess.code ?? null, name: guess.name ?? null, amount: guess.amount ?? null };
}

function UploadArea({ onFile, busy }: { onFile: (file: File) => void; busy: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-border"
      )}
    >
      {busy ? <Loader2 className="size-8 animate-spin text-muted-foreground" /> : <FileUp className="size-8 text-muted-foreground" />}
      <div>
        <p className="font-medium text-foreground">Arraste a planilha de orçamento aqui</p>
        <p className="text-sm text-muted-foreground">
          Arquivo .xlsx de até 2 MB, com o cabeçalho na primeira linha. O arquivo é guardado criptografado.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
        Escolher arquivo
      </Button>
    </div>
  );
}

function ColumnSelect({
  label,
  header,
  value,
  optional,
  onChange,
}: {
  label: string;
  header: string[];
  value: number | null;
  optional?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value === null ? (optional ? NONE : undefined) : String(value)}
        onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolha a coluna" />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>Sem identificador</SelectItem>}
          {header.map((title, index) => {
            const letter = columnLetter(index);
            return (
              <SelectItem key={index} value={String(index)}>
                {title === `Coluna ${letter}` ? title : `${letter} · ${title}`}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function MappingStep({
  projectId,
  draft,
  currentItems,
  lastMapping,
  onCancel,
}: {
  projectId: string;
  draft: Draft;
  currentItems: CurrentBudgetItem[];
  lastMapping: BudgetPageData["lastMapping"];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetIndex, setSheetIndex] = useState(() =>
    Math.max(0, draft.sheets.findIndex((sheet) => sheet.name === lastMapping?.sheetName))
  );
  const sheet = draft.sheets[sheetIndex];
  const [mapping, setMapping] = useState<PartialMapping>(() => initialMapping(sheet, lastMapping));
  const [linksByRow, setLinksByRow] = useState<Record<number, string>>({});
  const [excludedRows, setExcludedRows] = useState<number[]>([]);

  const completeMapping: ColumnMapping | null =
    mapping.name !== null && mapping.amount !== null ? { code: mapping.code, name: mapping.name, amount: mapping.amount } : null;
  const mappingValid = completeMapping !== null && isValidMapping(completeMapping, sheet.header.length);
  // React Compiler memoizes these
  const result = mappingValid && completeMapping ? applyMapping(sheet.rows, completeMapping) : null;
  const included = result ? selectIncludedItems(result.items, excludedRows) : [];
  const includedTotal = included.reduce((sum, item) => sum + item.plannedCents, 0);
  const manualLinks = linksByRowToIndexes(included, linksByRow);

  const isUpdate = currentItems.some((item) => item.status !== "removed");
  const diff =
    result && isUpdate ? matchBudgetItems(currentItems, included, { matchByCode: mapping.code !== null, manualLinks }) : null;
  // Old items a new row can be linked to: the unmatched ones plus those already linked by hand
  const linkedIds = new Set(Object.values(manualLinks));
  const linkedRows = new Set(Object.keys(manualLinks).map(Number));
  // Rows linked by hand stay in "Novas" so the link can be undone
  const newRows = diff ? [...new Set([...diff.added, ...linkedRows])].sort((a, b) => a - b) : [];
  const changedRows = diff ? diff.matched.filter((match) => match.changed && !linkedRows.has(match.incomingIndex)) : [];
  const linkable = diff
    ? [...currentItems.filter((item) => linkedIds.has(item.id)), ...diff.removedEmpty, ...diff.removedWithPayments]
    : [];
  const canApply = included.length > 0 && !pending;

  const toggleRow = (rowNumber: number, checked: boolean) =>
    setExcludedRows((rows) => (checked ? rows.filter((row) => row !== rowNumber) : [...rows, rowNumber]));
  const allChecked = Boolean(result && result.items.length > 0 && excludedRows.length === 0);

  const apply = () => {
    if (!completeMapping) return;
    startTransition(async () => {
      const includedRows = new Set(included.map((item) => item.rowNumber));
      const outcome = await applyBudgetVersionAction(projectId, draft.versionId, {
        sheetIndex,
        mapping: completeMapping,
        excludedRows,
        linksByRow: Object.fromEntries(Object.entries(linksByRow).filter(([row]) => includedRows.has(Number(row)))),
      });
      if (!outcome.ok) {
        toast.error(outcome.error);
        return;
      }
      toast.success(`Orçamento aplicado: ${outcome.data.itemCount} rubrica(s)`);
      router.push(`/projetos/${projectId}/rubricas`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold text-foreground">Quais colunas usar?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {draft.sheets.length > 1 && (
            <div className="space-y-1.5">
              <Label>Aba</Label>
              <Select
                value={String(sheetIndex)}
                onValueChange={(value) => {
                  const index = Number(value);
                  setSheetIndex(index);
                  setMapping(initialMapping(draft.sheets[index], lastMapping));
                  setLinksByRow({});
                  setExcludedRows([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {draft.sheets.map((entry, index) => (
                    <SelectItem key={index} value={String(index)}>
                      {entry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <ColumnSelect
            label="Identificador (opcional)"
            header={sheet.header}
            value={mapping.code}
            optional
            onChange={(code) => {
              setMapping({ ...mapping, code });
              setLinksByRow({});
            }}
          />
          <ColumnSelect label="Nome da rubrica" header={sheet.header} value={mapping.name} onChange={(name) => setMapping({ ...mapping, name })} />
          <ColumnSelect label="Valor total previsto" header={sheet.header} value={mapping.amount} onChange={(amount) => setMapping({ ...mapping, amount })} />
        </div>
        {completeMapping && !mappingValid && (
          <p className="text-sm text-destructive">Escolha uma coluna diferente para cada campo.</p>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          {result.errors.length > 0 && (
            <details className="rounded-2xl border bg-muted/30 p-4 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                <AlertTriangle className="size-4" />
                {result.errors.length} linha(s) não reconhecida(s) como rubrica ficarão de fora (títulos, subtotais, linhas sem
                valor…). Toque para ver.
              </summary>
              <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto text-muted-foreground">
                {result.errors.map((error) => (
                  <li key={error.rowNumber}>
                    Linha {error.rowNumber}: {error.message}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {diff && (
            <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
              <h2 className="font-semibold text-foreground">O que muda no orçamento</h2>
              {changedRows.length === 0 &&
                newRows.length === 0 &&
                diff.removedEmpty.length + diff.removedWithPayments.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma mudança nas rubricas.</p>
                )}

              {changedRows.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Alteradas</p>
                  <ul className="space-y-1 text-sm">
                    {changedRows.map((match) => {
                      const incoming = included[match.incomingIndex];
                      return (
                        <li key={match.current.id} className="flex flex-wrap items-center gap-2">
                          <span className="text-foreground">{formatBudgetItemLabel(incoming.code, incoming.name)}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {formatCents(match.current.plannedCents)} → {formatCents(incoming.plannedCents)}
                          </span>
                          {match.current.status === "out_of_budget" && <Badge variant="outline">Volta ao orçamento</Badge>}
                          {match.overspent && <Badge variant="destructive">Abaixo do já pago</Badge>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {newRows.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Novas</p>
                  <ul className="space-y-2 text-sm">
                    {newRows.map((index) => {
                      const incoming = included[index];
                      return (
                        <li key={index} className="flex flex-wrap items-center gap-2">
                          <span className="flex-1 text-foreground">
                            {formatBudgetItemLabel(incoming.code, incoming.name)}{" "}
                            <span className="tabular-nums text-muted-foreground">{formatCents(incoming.plannedCents)}</span>
                          </span>
                          {linkable.length > 0 && (
                            <Select
                              value={manualLinks[index] ?? NONE}
                              onValueChange={(value) => {
                                const next = { ...linksByRow };
                                if (value === NONE) delete next[incoming.rowNumber];
                                else next[incoming.rowNumber] = value;
                                setLinksByRow(next);
                              }}
                            >
                              <SelectTrigger size="sm" className="w-full sm:w-64" aria-label="Ligar a uma rubrica existente">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NONE}>É uma rubrica nova</SelectItem>
                                {linkable
                                  .filter((item) => !linkedIds.has(item.id) || manualLinks[index] === item.id)
                                  .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      É a antiga “{formatBudgetItemLabel(item.code, item.name)}”
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {diff.removedEmpty.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">Removidas (sem pagamentos)</p>
                  <ul className="space-y-0.5 text-sm text-muted-foreground">
                    {diff.removedEmpty.map((item) => (
                      <li key={item.id}>{formatBudgetItemLabel(item.code, item.name)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {diff.removedWithPayments.length > 0 && (
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="mb-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                    Saem do orçamento, mas têm pagamentos — ficarão como “fora do orçamento”, com previsto R$ 0
                  </p>
                  <ul className="space-y-0.5 text-sm">
                    {diff.removedWithPayments.map((item) => (
                      <li key={item.id}>
                        {formatBudgetItemLabel(item.code, item.name)}{" "}
                        <span className="text-muted-foreground">
                          ({item.paymentCount} pagamento(s), {formatCents(item.paidCents)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold text-foreground">Rubricas encontradas</h2>
              <p className="text-sm text-muted-foreground">Desmarque o que não deve entrar no projeto.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-4">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todas"
                      className="size-4 cursor-pointer accent-primary"
                      checked={allChecked}
                      onChange={(event) =>
                        setExcludedRows(event.target.checked ? [] : result.items.map((item) => item.rowNumber))
                      }
                    />
                  </TableHead>
                  <TableHead className="w-14">Linha</TableHead>
                  <TableHead>Rubrica</TableHead>
                  <TableHead className="text-right pr-4">Previsto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((item) => {
                  const checked = !excludedRows.includes(item.rowNumber);
                  return (
                    <TableRow
                      key={item.rowNumber}
                      className={cn("cursor-pointer", !checked && "text-muted-foreground")}
                      onClick={() => toggleRow(item.rowNumber, !checked)}
                    >
                      <TableCell className="pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Incluir linha ${item.rowNumber}`}
                          className="size-4 cursor-pointer accent-primary"
                          checked={checked}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => toggleRow(item.rowNumber, event.target.checked)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{item.rowNumber}</TableCell>
                      <TableCell className={cn("whitespace-normal", !checked && "line-through")}>
                        {formatBudgetItemLabel(item.code, item.name)}
                      </TableCell>
                      <TableCell className={cn("text-right pr-4 tabular-nums", !checked && "line-through")}>
                        {formatCents(item.plannedCents)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold hover:bg-transparent">
                  <TableCell className="pl-4" />
                  <TableCell />
                  <TableCell>
                    Total ({included.length} de {result.items.length} rubricas)
                  </TableCell>
                  <TableCell className="text-right pr-4 tabular-nums">{formatCents(includedTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={apply} disabled={!canApply}>
          {pending && <Loader2 className="animate-spin" />}
          {isUpdate ? "Aplicar remanejamento" : "Criar rubricas"}
        </Button>
      </div>
    </div>
  );
}

export function BudgetImport({
  projectId,
  page,
  currentItems,
}: {
  projectId: string;
  page: BudgetPageData;
  currentItems: CurrentBudgetItem[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [uploading, startUpload] = useTransition();

  const upload = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Envie a planilha em .xlsx. Se for .xls ou .ods, salve como .xlsx.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("A planilha pode ter no máximo 2 MB.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    startUpload(async () => {
      const result = await uploadBudgetFileAction(projectId, formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.data);
    });
  };

  return (
    <div className="space-y-5">
      {draft ? (
        <MappingStep
          key={draft.versionId}
          projectId={projectId}
          draft={draft}
          currentItems={currentItems}
          lastMapping={page.lastMapping}
          onCancel={() => setDraft(null)}
        />
      ) : (
        <>
          {page.versions.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Para um remanejamento, suba a nova versão da planilha. Antes de aplicar, você vê o que muda em cada rubrica, e
              nenhum pagamento é apagado.
            </p>
          )}
          <UploadArea onFile={upload} busy={uploading} />
        </>
      )}

      {page.versions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Versões aplicadas</h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
            {page.versions.map((version) => (
              <li key={version.id} className="flex items-center gap-3 px-4 py-2.5">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    Versão {version.versionNumber} · {version.originalFilename}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {new Date(version.appliedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </span>
                <Button asChild variant="ghost" size="icon-sm" aria-label="Baixar planilha">
                  <a href={`/api/projetos/${projectId}/orcamento/${version.id}`}>
                    <Download />
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
