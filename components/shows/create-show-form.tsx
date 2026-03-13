"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/commons/submit-button";
import {
  createShowSchema,
  type CreateShowInput,
  createShow,
} from "@/services/shows/actions";

const showStatusLabels: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

type FormInput = z.input<typeof createShowSchema>;

export function CreateShowForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createShowSchema),
    defaultValues: { status: "draft" },
  });

  async function onSubmit(data: FormInput) {
    const result = await createShow(data as CreateShowInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Espetáculo criado com sucesso!");
    router.push("/admin/espetaculos");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      {/* Informações Principais */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Informações Principais
        </h2>

        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" {...register("title")} placeholder="Título do espetáculo" />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtítulo</Label>
          <Input id="subtitle" {...register("subtitle")} placeholder="Subtítulo ou tagline" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortDescription">Descrição Curta</Label>
          <Input id="shortDescription" {...register("shortDescription")} placeholder="Até 255 caracteres" />
          {errors.shortDescription && <p className="text-sm text-destructive">{errors.shortDescription.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="synopsis">Sinopse</Label>
          <Textarea id="synopsis" {...register("synopsis")} rows={4} placeholder="Sinopse do espetáculo..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullDescription">Descrição Completa</Label>
          <Textarea id="fullDescription" {...register("fullDescription")} rows={6} placeholder="Descrição completa, notas de produção..." />
        </div>
      </section>

      {/* Detalhes Técnicos */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Detalhes Técnicos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="durationMinutes">Duração (minutos)</Label>
            <Input id="durationMinutes" type="number" {...register("durationMinutes")} placeholder="90" />
            {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="premiereDate">Data de Estreia</Label>
            <Input id="premiereDate" type="date" {...register("premiereDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ageRating">Classificação Etária</Label>
            <Input id="ageRating" {...register("ageRating")} placeholder="Livre / 12 anos" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Idioma</Label>
            <Input id="language" {...register("language")} placeholder="Português" />
          </div>
        </div>
      </section>

      {/* Publicação */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Publicação
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select defaultValue="draft" onValueChange={(v) => setValue("status", v as CreateShowInput["status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(showStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">URL da Imagem de Capa</Label>
            <Input id="coverImageUrl" {...register("coverImageUrl")} placeholder="https://..." />
            {errors.coverImageUrl && <p className="text-sm text-destructive">{errors.coverImageUrl.message}</p>}
          </div>
        </div>
      </section>

      <SubmitButton label="Criar Espetáculo" />
    </form>
  );
}
