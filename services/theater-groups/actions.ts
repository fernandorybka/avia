"use server";

import { z } from "zod";
import { db } from "@/db";
import { theaterGroups } from "@/db/schema";
import { slugify } from "@/services/commons/slugify";
import { actionSuccess, actionError, fromZodError, ActionResponse } from "@/services/commons/action-response";

export const createTheaterGroupSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(180),
  shortDescription: z.string().max(255).optional().or(z.literal("")),
  fullDescription: z.string().optional().or(z.literal("")),

  foundationYear: z.coerce.number().int().min(1800).max(2100).optional().nullable(),

  logoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  coverImageUrl: z.string().url("URL inválida").optional().or(z.literal("")),

  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  websiteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL inválida").optional().or(z.literal("")),

  cityId: z.coerce.number().int().positive().optional().nullable(),
  stateId: z.coerce.number().int().positive().optional().nullable(),
  countryId: z.coerce.number().int().positive().optional().nullable(),

  isActive: z.boolean().default(true),
});

export type CreateTheaterGroupInput = z.infer<typeof createTheaterGroupSchema>;

export async function createTheaterGroup(
  data: CreateTheaterGroupInput
): Promise<ActionResponse> {
  const parsed = createTheaterGroupSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  const { name, shortDescription, fullDescription, foundationYear, logoUrl,
    coverImageUrl, email, phone, websiteUrl, instagramUrl, facebookUrl,
    youtubeUrl, cityId, stateId, countryId, isActive } = parsed.data;

  try {
    await db.insert(theaterGroups).values({
      name,
      slug: slugify(name),
      shortDescription: shortDescription || null,
      fullDescription: fullDescription || null,
      foundationYear: foundationYear ?? null,
      logoUrl: logoUrl || null,
      coverImageUrl: coverImageUrl || null,
      email: email || null,
      phone: phone || null,
      websiteUrl: websiteUrl || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      youtubeUrl: youtubeUrl || null,
      cityId: cityId ?? null,
      stateId: stateId ?? null,
      countryId: countryId ?? null,
      isActive,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar grupo teatral. O nome pode já estar em uso.");
  }
}
