"use server";

import { z } from "zod";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { slugify } from "@/services/commons/slugify";
import { actionSuccess, actionError, fromZodError, ActionResponse } from "@/services/commons/action-response";

export const createVenueSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(180),
  description: z.string().optional().or(z.literal("")),
  venueType: z.enum([
    "theater", "street", "square", "cultural_center",
    "school", "independent_space", "gallery", "other",
  ]).default("theater"),

  address: z.string().optional().or(z.literal("")),
  neighborhood: z.string().max(120).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),

  cityId: z.coerce.number().int().positive().optional().nullable(),
  stateId: z.coerce.number().int().positive().optional().nullable(),
  countryId: z.coerce.number().int().positive().optional().nullable(),

  latitude: z.string().max(30).optional().or(z.literal("")),
  longitude: z.string().max(30).optional().or(z.literal("")),

  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  websiteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),

  isActive: z.boolean().default(true),
});

export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export async function createVenue(
  data: CreateVenueInput
): Promise<ActionResponse> {
  const parsed = createVenueSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  const { name, description, venueType, address, neighborhood, postalCode,
    cityId, stateId, countryId, latitude, longitude, email, phone,
    websiteUrl, instagramUrl, isActive } = parsed.data;

  try {
    await db.insert(venues).values({
      name,
      slug: slugify(name),
      description: description || null,
      venueType,
      address: address || null,
      neighborhood: neighborhood || null,
      postalCode: postalCode || null,
      cityId: cityId ?? null,
      stateId: stateId ?? null,
      countryId: countryId ?? null,
      latitude: latitude || null,
      longitude: longitude || null,
      email: email || null,
      phone: phone || null,
      websiteUrl: websiteUrl || null,
      instagramUrl: instagramUrl || null,
      isActive,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar espaço. O nome pode já estar em uso.");
  }
}
