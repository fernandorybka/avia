"use client";

import { useFormStatus } from "react-dom";
import { uploadTemplateAction } from "@/services/document-actions";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";

export function UploadTemplate() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-2 border-dashed border-muted hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <FileUp className="w-5 h-5 text-primary" />
          Enviar Novo Modelo
        </CardTitle>
        <CardDescription>
          Selecione um arquivo .docx para extrair as variáveis e criar um modelo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={uploadTemplateAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Modelo</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="Ex: Contrato Padrão v1" 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo Docx</Label>
            <Input 
              id="file" 
              name="file" 
              type="file" 
              accept=".docx" 
              required 
              className="cursor-pointer file:cursor-pointer file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground"
            />
            <p className="text-[0.7rem] text-muted-foreground">Apenas arquivos .docx são suportados no momento.</p>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enviando & Analisando...
        </>
      ) : (
        "Enviar & Analisar"
      )}
    </Button>
  );
}
