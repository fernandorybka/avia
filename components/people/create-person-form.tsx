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
  createPersonSchema,
  type CreatePersonInput,
  createPerson,
} from "@/services/people/actions";

interface Country { id: number; name: string }
interface State { id: number; name: string; countryId: number | null }
interface City { id: number; name: string; stateId: number | null }

type FormInput = z.input<typeof createPersonSchema>;

interface CreatePersonFormProps {
  countries: Country[];
  states: State[];
  cities: City[];
}

export function CreatePersonForm({ countries, states, cities }: CreatePersonFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: { status: "active" },
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
    const result = await createPerson(data as CreatePersonInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Pessoa criada com sucesso!");
    router.push("/admin/pessoas");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
      {/* Informações principais */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Informações Principais
        </h2>

        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" {...register("name")} placeholder="Nome completo" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="socialName">Nome Social</Label>
          <Input id="socialName" {...register("socialName")} placeholder="Como prefere ser chamada(o)" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biografia</Label>
          <Textarea id="bio" {...register("bio")} placeholder="Uma breve biografia..." rows={4} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="photoUrl">URL da Foto</Label>
          <Input id="photoUrl" {...register("photoUrl")} placeholder="https://..." />
          {errors.photoUrl && <p className="text-sm text-destructive">{errors.photoUrl.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            defaultValue="active"
            onValueChange={(v) => setValue("status", v as CreatePersonInput["status"])}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
            </SelectContent>
          </Select>
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
            <Input id="email" type="email" {...register("email")} placeholder="email@exemplo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register("phone")} placeholder="(11) 99999-9999" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Label htmlFor="countryId">País</Label>
            <Select onValueChange={(v) => { setValue("countryId", Number(v)); setValue("stateId", null); setValue("cityId", null); }}>
              <SelectTrigger id="countryId"><SelectValue placeholder="País" /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stateId">Estado</Label>
            <Select onValueChange={(v) => { setValue("stateId", Number(v)); setValue("cityId", null); }}>
              <SelectTrigger id="stateId"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                {filteredStates.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cityId">Cidade</Label>
            <Select onValueChange={(v) => setValue("cityId", Number(v))}>
              <SelectTrigger id="cityId"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                {filteredCities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <SubmitButton label="Criar Pessoa" />
    </form>
  );
}
