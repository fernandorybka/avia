"use client";

import { useFormStatus } from "react-dom";
import { uploadTemplateAction } from "@/services/document-actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "./ui/dialog";
import { useState } from "react";
import { FileUp, Loader2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function UploadTemplate() {
  const [isOpen, setIsOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateAndSetFile = (file: File) => {
    setFileError(null);
    if (file.size > 1024 * 1024) {
      setFileError("O arquivo não pode ter mais de 1MB.");
      return false;
    }
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'docx' && extension !== 'doc') {
      setFileError("Apenas arquivos .doc e .docx são suportados.");
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setSelectedFile(null);
        setFileError(null);
      }
    }}>
      <DialogTrigger asChild>
        <Card className="group cursor-pointer border-2 border-dashed border-accent/40 hover:border-accent hover:bg-accent/5 transition-all flex flex-col relative bg-card/50 h-full">
          <CardHeader className="pb-3">
             <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <CardTitle className="pt-2">Novo Modelo</CardTitle>
            <CardDescription>Adicionar novo .docx</CardDescription>
          </CardHeader>
        </Card>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileUp className="w-5 h-5 text-primary" />
            Enviar Novo Modelo
          </DialogTitle>
          <DialogDescription>
            Arraste seu arquivo ou selecione manualmente abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <form 
          action={async (formData) => {
            const fileInForm = formData.get("file") as File;
            
            // If dragging and dropping, the form might not have the file, use selectedFile
            if (selectedFile && (!fileInForm || fileInForm.size === 0)) {
              formData.set("file", selectedFile);
            }

            if (!formData.get("name") || !(formData.get("file") as File)?.size) {
              setFileError("Nome e arquivo são obrigatórios.");
              return;
            }

            try {
              setIsOpen(false);
              await uploadTemplateAction(formData);
              toast.success("Modelo enviado com sucesso!");
            } catch (error: any) {
              // Ignore NEXT_REDIRECT errors as they are expected behavior for redirect()
              if (error?.message?.includes("NEXT_REDIRECT")) {
                return;
              }
              toast.error("Erro ao enviar modelo. Verifique se o arquivo é um .docx válido.");
              console.error(error);
            }
          }} 
          className="space-y-6 pt-4"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">Nome do Modelo</Label>
              <Input 
                id="name" 
                name="name" 
                placeholder="Ex: Contrato de Aluguel v2" 
                required 
                className="bg-muted/30"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Arquivo</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer",
                  isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
                  selectedFile ? "border-primary/50 bg-primary/5" : ""
                )}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input 
                  id="file-input"
                  name="file"
                  type="file" 
                  accept=".docx,.doc" 
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-1 transition-colors",
                  selectedFile ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                )}>
                  {selectedFile ? <FileText className="w-6 h-6" /> : <FileUp className="w-6 h-6" />}
                </div>
                
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : (isDragging ? "Solte para enviar" : "Arraste ou clique")}
                  </p>
                  <p className="text-[0.7rem] text-muted-foreground mt-1">
                    {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Máximo 1MB (.doc/.docx)"}
                  </p>
                </div>

                {selectedFile && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary text-white p-1 rounded-full">
                      <Plus className="w-3 h-3 rotate-45" onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }} />
                    </div>
                  </div>
                )}
              </div>
              
              {fileError && (
                <p className="text-xs text-destructive font-medium mt-2">{fileError}</p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <SubmitButton disabled={!!fileError || (!selectedFile && !isOpen)} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} className="w-full sm:w-auto px-10 font-bold shadow-md">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enviando...
        </>
      ) : (
        "Processar Modelo"
      )}
    </Button>
  );
}
