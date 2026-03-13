"use server";

import { z } from "zod";
import { db } from "@/db";
import { people } from "@/db/schema";
import { slugify } from "@/services/commons/slugify";
import { actionSuccess, actionError, fromZodError, ActionResponse } from "@/services/commons/action-response";

export const createPersonSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(160),
  socialName: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url("URL inválida").optional().or(z.literal("")),

  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  websiteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  instagramUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  facebookUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  youtubeUrl: z.string().url("URL inválida").optional().or(z.literal("")),

  cityId: z.coerce.number().int().positive().optional().nullable(),
  stateId: z.coerce.number().int().positive().optional().nullable(),
  countryId: z.coerce.number().int().positive().optional().nullable(),

  status: z.enum(["active", "inactive", "draft"]).default("active"),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export async function createPerson(
  data: CreatePersonInput
): Promise<ActionResponse> {
  const parsed = createPersonSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  const { name, socialName, bio, photoUrl, email, phone, websiteUrl,
    instagramUrl, facebookUrl, youtubeUrl, cityId, stateId, countryId, status } = parsed.data;

  try {
    await db.insert(people).values({
      name,
      slug: slugify(name),
      socialName: socialName || null,
      bio: bio || null,
      photoUrl: photoUrl || null,
      email: email || null,
      phone: phone || null,
      websiteUrl: websiteUrl || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      youtubeUrl: youtubeUrl || null,
      cityId: cityId ?? null,
      stateId: stateId ?? null,
      countryId: countryId ?? null,
      status,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar pessoa. O nome pode já estar em uso.");
  }
}
