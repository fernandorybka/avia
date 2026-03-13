"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
  createStateSchema,
  type CreateStateInput,
  createState,
} from "@/services/location/actions";

interface Country {
  id: number;
  name: string;
}

type FormInput = z.input<typeof createStateSchema>;

interface CreateStateFormProps {
  countries: Country[];
}

export function CreateStateForm({ countries }: CreateStateFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createStateSchema),
  });

  async function onSubmit(data: FormInput) {
    const result = await createState(data as CreateStateInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Estado criado com sucesso!");
    router.push("/admin/localizacao/estados");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="countryId">País *</Label>
        <Select onValueChange={(v) => setValue("countryId", Number(v))}>
          <SelectTrigger id="countryId">
            <SelectValue placeholder="Selecione um país" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.countryId && (
          <p className="text-sm text-destructive">{errors.countryId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register("name")} placeholder="São Paulo" />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código</Label>
        <Input id="code" {...register("code")} placeholder="SP" className="max-w-[120px]" />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      <SubmitButton label="Criar Estado" />
    </form>
  );
}
