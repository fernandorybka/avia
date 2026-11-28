"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCircle2, Key, Calendar, Trash2, ListOrdered } from "lucide-react";
import { Button } from "./ui/button";
import { deleteGenerationAction, updateGenerationGroupAction, updateGroupOrderAction } from "@/services/document-actions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupedCadastroSelectItems, GroupOrderEditor, GroupPicker } from "./CadastroGroups";
import { groupCadastros, listGroupNames } from "@/lib/cadastro-groups";

type Generation = {
  id: string;
  name: string;
  groupName: string | null;
  createdAt: Date;
};

type Value = {
  id: string;
  generationId: string;
  fieldKey: string;
  fieldValue: string;
};

interface CadastrosViewerProps {
  generations: Generation[];
  groupedValues: Record<string, Value[]>;
  groupOrder: string[];
}

export function CadastrosViewer({ 
  generations: initialGenerations, 
  groupedValues: initialGroupedValues,
  groupOrder: initialGroupOrder
}: CadastrosViewerProps) {
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [groupedValues, setGroupedValues] = useState<Record<string, Value[]>>(initialGroupedValues);
  const [groupOrder, setGroupOrder] = useState<string[]>(initialGroupOrder);
  // Start on the first cadastro as the grouped select lists them
  const [selectedId, setSelectedId] = useState<string>(
    () => groupCadastros(initialGenerations, initialGroupOrder)[0]?.items[0]?.id || ""
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const groupNames = useMemo(() => listGroupNames(generations, groupOrder), [generations, groupOrder]);

  const changeGroupOrder = async (nextOrder: string[]) => {
    const previous = groupOrder;
    setGroupOrder(nextOrder);
    try {
      await updateGroupOrderAction(nextOrder);
    } catch (error) {
      setGroupOrder(previous);
      toast.error("Erro ao salvar a ordem dos níveis.");
      console.error(error);
    }
  };

  const changeGroup = async (groupName: string | null) => {
    if (!selectedId) return;

    setIsSavingGroup(true);
    try {
      const result = await updateGenerationGroupAction(selectedId, groupName);
      setGenerations(prev => prev.map(g => g.id === selectedId ? { ...g, groupName: result.groupName } : g));
      toast.success("Nível atualizado.");
    } catch (error) {
      toast.error("Erro ao alterar o nível.");
      console.error(error);
    } finally {
      setIsSavingGroup(false);
    }
  };
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const confirmDelete = async () => {
    if (!selectedId) return;

    setIsDeleting(true);
    try {
      await deleteGenerationAction(selectedId);
      toast.success("Perfil excluído com sucesso.");
      
      const newGenerations = generations.filter(g => g.id !== selectedId);
      setGenerations(newGenerations);
      
      // Update groupedValues by removing the deleted generation
      const newGroupedValues = { ...groupedValues };
      delete newGroupedValues[selectedId];
      setGroupedValues(newGroupedValues);

      setSelectedId(groupCadastros(newGenerations, groupOrder)[0]?.items[0]?.id || "");
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Erro ao excluir perfil.");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };


  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado!", { duration: 1500 });
    } catch (error) {
      toast.error("Não foi possível copiar.");
      console.error(error);
    }
  };

  const selectedGen = generations.find(g => g.id === selectedId);
  
  const genValues = useMemo(() => {
    if (!selectedId) return [];
    const rawValues = groupedValues[selectedId] || [];
    return [...rawValues].sort((a, b) => {
      const isANome = a.fieldKey.toUpperCase() === "NOME";
      const isBNome = b.fieldKey.toUpperCase() === "NOME";
      if (isANome) return -1;
      if (isBNome) return 1;
      return a.fieldKey.localeCompare(b.fieldKey);
    });
  }, [selectedId, groupedValues]);

  if (generations.length === 0) {
    return (
      <div className="col-span-full py-16 text-center bg-card rounded-xl border border-border max-w-2xl mx-auto">
        <p className="text-muted-foreground">Nenhum dado salvo. Crie documentos e marque &quot;Salvar&quot; para acumular perfis globais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-xl border border-border max-w-md mx-auto">
        <div className="space-y-2">
          <label htmlFor="profile-select" className="text-sm font-semibold text-foreground">
            Selecione o Registro
          </label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger id="profile-select" className="w-full bg-background">
              <SelectValue placeholder="Selecione um registro" />
            </SelectTrigger>
            <SelectContent>
              <GroupedCadastroSelectItems items={generations} order={groupOrder} />
            </SelectContent>
          </Select>
        </div>
      </div>

      {groupNames.length > 1 && (
        <details className="p-4 bg-muted/50 rounded-xl border border-border max-w-md mx-auto">
          <summary className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Ordem dos níveis
          </summary>
          <p className="text-xs text-muted-foreground mt-2 mb-3">
            Define a ordem em que os níveis aparecem nas listas de cadastros.
          </p>
          <GroupOrderEditor groupNames={groupNames} onChange={changeGroupOrder} />
        </details>
      )}

      {selectedGen && (
        <Card className="border-border shadow-sm overflow-hidden flex flex-col max-w-2xl mx-auto">
          <CardHeader className="bg-muted/50 border-b border-border pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                <UserCircle2 className="w-5 h-5 text-primary" />
                {selectedGen.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5" />
                Salvo originalmente em: {new Date(selectedGen.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                title="Excluir este cadastro permanentemente"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2 mb-4 pb-4 border-b border-border/50">
              <label htmlFor="group-picker" className="text-sm font-semibold text-foreground">
                Nível
              </label>
              <GroupPicker
                id="group-picker"
                value={selectedGen.groupName}
                onChange={changeGroup}
                groupNames={groupNames}
                disabled={isSavingGroup}
              />
            </div>
            {genValues.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-6">Nenhuma variável vinculada a este registro.</p>
            ) : (
              <div className="space-y-3">
                {genValues.map(v => (
                  <div key={v.id} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                      <Key className="w-4 h-4 text-muted-foreground/60" />
                      {v.fieldKey.replace(/_/g, " ")}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyValue(v.fieldValue)}
                      title="Clique para copiar"
                      className="text-foreground max-w-[60%] font-mono text-sm bg-muted px-2 py-1 rounded break-all text-right cursor-pointer transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {v.fieldValue}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o perfil
              <strong> {selectedGen?.name}</strong> e todos os seus dados salvos do nosso banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              variant="destructive"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Sim, excluir permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
