"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "./ui/card";
import { createGenerationAction, fetchGenerationValuesAction } from "@/services/document-actions";
import { useState, useEffect, useMemo } from "react";
import { Loader2, CheckCircle2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Switch } from "./ui/switch";

interface Placeholder {
  fieldKey: string;
}

interface TemplateFormProps {
  templateId: string;
  templateName: string;
  placeholders: Placeholder[];
  pastGenerations?: { id: string; name: string }[];
}

export function TemplateForm({ templateId, templateName, placeholders: initialPlaceholders, pastGenerations = [] }: TemplateFormProps) {
  const router = useRouter();
  // Memoize sorted placeholders to avoid infinite re-renders in useEffect
  const placeholders = useMemo(() => {
    return [...initialPlaceholders].sort((a, b) => {
      const isANome = a.fieldKey.toUpperCase() === "NOME";
      const isBNome = b.fieldKey.toUpperCase() === "NOME";
      if (isANome) return -1;
      if (isBNome) return 1;
      return 0;
    });
  }, [initialPlaceholders]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("new");
  const [shouldSaveMap, setShouldSaveMap] = useState<Record<string, boolean>>(() => {
    return placeholders.reduce((acc, p) => ({ ...acc, [p.fieldKey]: true }), {});
  });

  const schemaShape: Record<string, z.ZodString> = {};
  placeholders.forEach((p) => {
    schemaShape[p.fieldKey] = z.string().min(1, "Campo obrigatório");
  });

  const schema = z.object(schemaShape);
  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: placeholders.reduce((acc, p) => ({ ...acc, [p.fieldKey]: "" }), {}),
  });

  useEffect(() => {
    let active = true;
    async function loadValues() {
      if (selectedProfile === "new") {
        reset(placeholders.reduce((acc, p) => ({ ...acc, [p.fieldKey]: "" }), {}));
      } else {
        const generation = pastGenerations.find(g => g.id === selectedProfile);
        if (generation && active) {
          const values = await fetchGenerationValuesAction(generation.id);
          if (!active) return;
          const newValues: Record<string, string> = {};
          
          // Ensure all template placeholders are cleared before filling from DB
          placeholders.forEach(p => {
            newValues[p.fieldKey] = "";
          });

          values.forEach(v => {
            newValues[v.fieldKey] = v.fieldValue;
          });
          reset(newValues);
        }
      }
    }
    loadValues();
    return () => { active = false; };
  }, [selectedProfile, reset]); // Removed placeholders and pastGenerations from deps to avoid loops

  const toggleSave = (fieldKey: string, value?: boolean) => {
    setShouldSaveMap(prev => ({
      ...prev,
      [fieldKey]: value !== undefined ? value : !prev[fieldKey]
    }));
  };

  const onSubmit = async (data: FormData) => {
    const genName = data["NOME"] || data["nome"] || data["Nome"];
    if (!genName || typeof genName !== 'string' || !genName.trim()) {
      alert("É necessário que exista e esteja preenchido um campo chamado 'NOME' no formulário para salvar o registro.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await createGenerationAction(templateId, genName.trim(), data, shouldSaveMap);
      
      // Trigger download
      window.location.href = `/api/download?templateId=${templateId}&generationId=${response.generationId}`;
      
      toast.success("Documento gerado com sucesso!", {
        description: "O download deve começar em instantes.",
      });
      
      // Sync form with actually saved values to clear non-saved inputs
      const savedValues = await fetchGenerationValuesAction(response.generationId);
      const syncedData: Record<string, string> = {};
      
      // Initialize all placeholders to empty first (to clear non-saved ones)
      placeholders.forEach(p => syncedData[p.fieldKey] = "");
      // Then fill from DB
      savedValues.forEach(v => syncedData[v.fieldKey] = v.fieldValue);
      
      reset(syncedData);
      setSelectedProfile(response.generationId);
      
      router.refresh();
      
    } catch (error) {
      console.error("Failed to create generation:", error);
      alert("Houve um erro ao processar seu documento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-slate-200">
      <CardHeader className="border-b bg-slate-50/50 rounded-t-xl">
        <CardTitle className="text-2xl font-bold text-slate-800">{templateName}</CardTitle>
        <CardDescription>
          Preencha os campos abaixo para gerar um novo documento.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        
        <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="space-y-2">
            <Label htmlFor="profile-select" className="text-slate-700 font-semibold">
              Carregar dados salvos
            </Label>
            <select
              id="profile-select"
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="new">-- Novo Preenchimento (Em branco) --</option>
              {pastGenerations.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            {placeholders.map((p, idx) => (
              <div key={p.fieldKey} className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <Label htmlFor={p.fieldKey} className="text-slate-700 font-medium capitalize">
                    {p.fieldKey.replace(/_/g, " ").toLowerCase()}
                  </Label>
                  <div className="flex items-center gap-2" title="Salvar este campo no banco de dados para a próxima vez">
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Salvar</span>
                    <Switch 
                      checked={shouldSaveMap[p.fieldKey]} 
                      onCheckedChange={(checked) => toggleSave(p.fieldKey, checked)}
                      tabIndex={placeholders.length + 2 + idx}
                    />
                  </div>
                </div>
                
                <Input
                  id={p.fieldKey}
                  placeholder={`Digite ${p.fieldKey.toLowerCase()}`}
                  {...register(p.fieldKey)}
                  className={errors[p.fieldKey] ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200"}
                  tabIndex={idx + 1}
                />
                
                {errors[p.fieldKey] && (
                  <p className="text-xs text-red-500 font-medium">{errors[p.fieldKey]?.message as string}</p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              <span>Ajuste os dados e gere o documento abaixo.</span>
            </div>
            <Button 
                type="submit" 
                size="lg" 
                className="w-full sm:w-auto px-10 shadow-md hover:shadow-lg transition-all" 
                disabled={isSubmitting}
                tabIndex={placeholders.length + 1}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar e Gerar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
