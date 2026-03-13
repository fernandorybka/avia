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
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/commons/submit-button";
import {
  createTheaterGroupSchema,
  type CreateTheaterGroupInput,
  createTheaterGroup,
} from "@/services/theater-groups/actions";

interface Country { id: number; name: string }
interface State { id: number; name: string; countryId: number | null }
interface City { id: number; name: string; stateId: number | null }

type FormInput = z.input<typeof createTheaterGroupSchema>;

interface CreateTheaterGroupFormProps {
  countries: Country[];
  states: State[];
  cities: City[];
}

export function CreateTheaterGroupForm({ countries, states, cities }: CreateTheaterGroupFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createTheaterGroupSchema),
    defaultValues: { isActive: true },
  });

  const selectedCountryId = watch("countryId");
  const selectedStateId = watch("stateId");
  const filteredStates = selectedCountryId
    ? states.filter((s) => s.countryId === Number(selectedCountryId))
    : states;
  const filteredCities = selectedStateId
    ? cities.filter((c) => c.stateId === Number(selectedStateId))
    : cities;

  async function onSubmit(data: FormInput) {
    const result = await createTheaterGroup(data as CreateTheaterGroupInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Grupo teatral criado com sucesso!");
    router.push("/admin/grupos-teatrais");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      {/* Informações Principais */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Informações Principais
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register("name")} placeholder="Nome do grupo" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortDescription">Descrição Curta</Label>
          <Input id="shortDescription" {...register("shortDescription")} placeholder="Até 255 caracteres" />
          {errors.shortDescription && <p className="text-sm text-destructive">{errors.shortDescription.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullDescription">Descrição Completa</Label>
          <Textarea id="fullDescription" {...register("fullDescription")} rows={4} placeholder="Descrição completa do grupo..." />
        </div>

        <div className="space-y-2">
          <Label htmlFor="foundationYear">Ano de Fundação</Label>
          <Input id="foundationYear" type="number" {...register("foundationYear")} placeholder="Ex: 2005" className="max-w-[200px]" />
          {errors.foundationYear && <p className="text-sm text-destructive">{errors.foundationYear.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL do Logo</Label>
            <Input id="logoUrl" {...register("logoUrl")} placeholder="https://..." />
            {errors.logoUrl && <p className="text-sm text-destructive">{errors.logoUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverImageUrl">URL da Imagem de Capa</Label>
            <Input id="coverImageUrl" {...register("coverImageUrl")} placeholder="https://..." />
            {errors.coverImageUrl && <p className="text-sm text-destructive">{errors.coverImageUrl.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="isActive"
            defaultChecked
            onCheckedChange={(v) => setValue("isActive", v)}
          />
          <Label htmlFor="isActive">Grupo ativo</Label>
        </div>
      </section>

      {/* Contato */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Contato
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register("email")} placeholder="contato@grupo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register("phone")} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website</Label>
            <Input id="websiteUrl" {...register("websiteUrl")} placeholder="https://..." />
            {errors.websiteUrl && <p className="text-sm text-destructive">{errors.websiteUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input id="instagramUrl" {...register("instagramUrl")} placeholder="https://instagram.com/..." />
            {errors.instagramUrl && <p className="text-sm text-destructive">{errors.instagramUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input id="facebookUrl" {...register("facebookUrl")} placeholder="https://facebook.com/..." />
            {errors.facebookUrl && <p className="text-sm text-destructive">{errors.facebookUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtubeUrl">YouTube</Label>
            <Input id="youtubeUrl" {...register("youtubeUrl")} placeholder="https://youtube.com/..." />
            {errors.youtubeUrl && <p className="text-sm text-destructive">{errors.youtubeUrl.message}</p>}
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Localização
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>País</Label>
            <Select onValueChange={(v) => { setValue("countryId", Number(v)); setValue("stateId", null); setValue("cityId", null); }}>
              <SelectTrigger><SelectValue placeholder="País" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select onValueChange={(v) => { setValue("stateId", Number(v)); setValue("cityId", null); }}>
              <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                {filteredStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select onValueChange={(v) => setValue("cityId", Number(v))}>
              <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                {filteredCities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <SubmitButton label="Criar Grupo Teatral" />
    </form>
  );
}
