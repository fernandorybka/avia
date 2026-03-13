"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/commons/submit-button";
import {
  createCountrySchema,
  type CreateCountryInput,
  createCountry,
} from "@/services/location/actions";

type FormInput = z.input<typeof createCountrySchema>;

export function CreateCountryForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createCountrySchema),
  });

  async function onSubmit(data: FormInput) {
    const result = await createCountry(data as CreateCountryInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("País criado com sucesso!");
    router.push("/admin/localizacao/paises");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register("name")} placeholder="Brasil" />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código (ISO)</Label>
        <Input id="code" {...register("code")} placeholder="BR" className="max-w-[120px]" />
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      <SubmitButton label="Criar País" />
    </form>
  );
}
