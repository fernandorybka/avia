"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowRight, Trash2, Calendar } from "lucide-react";
import { TagInput } from "./TagInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteTemplateAction } from "@/services/document-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    slug: string;
    tags: string[];
    createdAt: Date;
  };
  allAvailableTags: string[];
}

export function TemplateCard({ template, allAvailableTags }: TemplateCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTemplateAction(template.id);
      toast.success("Modelo removido com sucesso.");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao remover modelo.");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="group hover:shadow-md transition-all border-border overflow-hidden flex flex-col">
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <FileText className="w-5 h-5" />
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o modelo <strong>{template.name}</strong>? 
                  Esta ação não pode ser desfeita e removerá permanentemente o arquivo e seus dados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} variant="destructive">
                  {isDeleting ? "Excluindo..." : "Sim, excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        
        <CardTitle className="pt-2">{template.name}</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Criado em {new Date(template.createdAt).toLocaleDateString("pt-BR")}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <TagInput 
          templateId={template.id} 
          initialTags={template.tags} 
          allAvailableTags={allAvailableTags}
        />
      </CardContent>
      
      <CardFooter className="pt-0">
        <Link href={`/template/${template.slug}`} className="w-full">
          <Button variant="outline" className="w-full justify-between group/btn">
            Gerar Documento
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
