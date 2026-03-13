"use client";

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
  createCitySchema,
  type CreateCityInput,
  createCity,
} from "@/services/location/actions";

interface Country {
  id: number;
  name: string;
}

interface State {
  id: number;
  name: string;
  countryId: number | null;
}

type FormInput = z.input<typeof createCitySchema>;

interface CreateCityFormProps {
  countries: Country[];
  states: State[];
}

export function CreateCityForm({ countries, states }: CreateCityFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createCitySchema),
  });

  const selectedCountryId = watch("countryId");
  const filteredStates = selectedCountryId
    ? states.filter((s) => s.countryId === Number(selectedCountryId))
    : states;

  async function onSubmit(data: FormInput) {
    const result = await createCity(data as CreateCityInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Cidade criada com sucesso!");
    router.push("/admin/localizacao/cidades");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="countryId">País *</Label>
        <Select
          onValueChange={(v) => {
            setValue("countryId", Number(v));
            setValue("stateId", null);
          }}
        >
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
        <Label htmlFor="stateId">Estado</Label>
        <Select onValueChange={(v) => setValue("stateId", Number(v))}>
          <SelectTrigger id="stateId">
            <SelectValue placeholder="Selecione um estado (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {filteredStates.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" {...register("name")} placeholder="São Paulo" />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <SubmitButton label="Criar Cidade" />
    </form>
  );
}
