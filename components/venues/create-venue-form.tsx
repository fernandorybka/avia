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
  createVenueSchema,
  type CreateVenueInput,
  createVenue,
} from "@/services/venues/actions";

interface Country { id: number; name: string }
interface State { id: number; name: string; countryId: number | null }
interface City { id: number; name: string; stateId: number | null }

interface CreateVenueFormProps {
  countries: Country[];
  states: State[];
  cities: City[];
}

type FormInput = z.input<typeof createVenueSchema>;

const venueTypeLabels: Record<string, string> = {
  theater: "Teatro",
  street: "Rua",
  square: "Praça",
  cultural_center: "Centro Cultural",
  school: "Escola",
  independent_space: "Espaço Independente",
  gallery: "Galeria",
  other: "Outro",
};

export function CreateVenueForm({ countries, states, cities }: CreateVenueFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInput>({
    resolver: zodResolver(createVenueSchema),
    defaultValues: { venueType: "theater", isActive: true },
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
    const result = await createVenue(data as CreateVenueInput);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Espaço criado com sucesso!");
    router.push("/admin/espacos");
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
          <Input id="name" {...register("name")} placeholder="Nome do espaço" />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="venueType">Tipo de Espaço</Label>
          <Select defaultValue="theater" onValueChange={(v) => setValue("venueType", v as CreateVenueInput["venueType"])}>
            <SelectTrigger id="venueType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(venueTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" {...register("description")} rows={3} placeholder="Descrição do espaço..." />
        </div>

        <div className="flex items-center gap-3">
          <Switch id="isActive" defaultChecked onCheckedChange={(v) => setValue("isActive", v)} />
          <Label htmlFor="isActive">Espaço ativo</Label>
        </div>
      </section>

      {/* Endereço */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Endereço
        </h2>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" {...register("address")} placeholder="Rua, número" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" {...register("neighborhood")} placeholder="Bairro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">CEP</Label>
            <Input id="postalCode" {...register("postalCode")} placeholder="00000-000" />
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4 max-w-xs">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input id="latitude" {...register("latitude")} placeholder="-23.5505" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input id="longitude" {...register("longitude")} placeholder="-46.6333" />
          </div>
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
            <Input id="email" type="email" {...register("email")} placeholder="contato@espaco.com" />
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
        </div>
      </section>

      <SubmitButton label="Criar Espaço" />
    </form>
  );
}
