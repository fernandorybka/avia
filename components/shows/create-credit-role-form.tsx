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
  createCreditRoleSchema,
  type CreateCreditRoleInput,
  createCreditRole,
} from "@/services/shows/actions";

const departmentLabels: Record<string, string> = {
  artistic: "Artístico",
  technical: "Técnico",
  production: "Produção",
  accessibility: "Acessibilidade",
  music: "Música",
  communication: "Comunicação",
  other: "Outro",
};

type FormInput = z.input<typeof createCreditRoleSchema>;

export function CreateCreditRoleForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createCreditRoleSchema),
    defaultValues: { department: "other", sortOrder: 0 },
  });

  async function onSubmit(data: FormInput) {
    const result = await createCreditRole(data as CreateCreditRoleInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Função de crédito criada com sucesso!");
    router.push("/admin/funcoes-de-credito");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register("name")} placeholder="Ex: Direção, Iluminação, Produção..." />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Departamento</Label>
        <Select defaultValue="other" onValueChange={(v) => setValue("department", v as CreateCreditRoleInput["department"])}>
          <SelectTrigger id="department">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(departmentLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...register("description")} rows={3} placeholder="Descrição desta função..." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Ordem de Exibição</Label>
        <Input id="sortOrder" type="number" {...register("sortOrder")} className="max-w-[150px]" defaultValue={0} />
      </div>

      <SubmitButton label="Criar Função de Crédito" />
    </form>
  );
}
