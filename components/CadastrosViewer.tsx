"use client";

import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserCircle2, Key, Calendar, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { deleteGenerationAction } from "@/services/document-actions";
import { useRouter } from "next/navigation";
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

type Generation = {
  id: string;
  name: string;
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
}

export function CadastrosViewer({ generations, groupedValues }: CadastrosViewerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(generations[0]?.id || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const confirmDelete = async () => {
    if (!selectedId) return;

    setIsDeleting(true);
    try {
      await deleteGenerationAction(selectedId);
      toast.success("Perfil excluído com sucesso.");
      setSelectedId(generations.find(g => g.id !== selectedId)?.id || "");
      router.refresh();
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Erro ao excluir perfil.");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };


  if (generations.length === 0) {
    return (
      <div className="col-span-full py-16 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-slate-400">Nenhum dado salvo. Crie documentos e marque "Salvar" para acumular perfis globais.</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 max-w-md mx-auto">
        <div className="space-y-2">
          <label htmlFor="profile-select" className="text-sm font-semibold text-slate-700">
            Selecione o Registro
          </label>
          <select
            id="profile-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {generations.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedGen && (
        <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col max-w-2xl mx-auto">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-800">
                <UserCircle2 className="w-5 h-5 text-indigo-500" />
                {selectedGen.name}
              </CardTitle>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5" />
                Salvo originalmente em: {new Date(selectedGen.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                title="Excluir este cadastro permanentemente"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {genValues.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">Nenhuma variável vinculada a este registro.</p>
            ) : (
              <div className="space-y-3">
                {genValues.map(v => (
                  <div key={v.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Key className="w-4 h-4 text-slate-400" />
                      {v.fieldKey.replace(/_/g, " ")}
                    </div>
                    <span className="text-slate-900 max-w-[60%] font-mono text-sm bg-slate-100 px-2 py-1 rounded select-all break-all text-right">
                      {v.fieldValue}
                    </span>
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
