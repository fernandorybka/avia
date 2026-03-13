"use server";

import { z } from "zod";
import { db } from "@/db";
import { shows, creditRoles } from "@/db/schema";
import { slugify } from "@/services/commons/slugify";
import { actionSuccess, actionError, fromZodError, ActionResponse } from "@/services/commons/action-response";

// ─── Show ──────────────────────────────────────────────────────────────────

export const createShowSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200),
  subtitle: z.string().max(220).optional().or(z.literal("")),
  shortDescription: z.string().max(255).optional().or(z.literal("")),
  synopsis: z.string().optional().or(z.literal("")),
  fullDescription: z.string().optional().or(z.literal("")),

  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  premiereDate: z.string().optional().or(z.literal("")), // ISO date string
  ageRating: z.string().max(40).optional().or(z.literal("")),
  language: z.string().max(80).optional().or(z.literal("")),

  coverImageUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

export type CreateShowInput = z.infer<typeof createShowSchema>;

export async function createShow(
  data: CreateShowInput
): Promise<ActionResponse> {
  const parsed = createShowSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  const { title, subtitle, shortDescription, synopsis, fullDescription,
    durationMinutes, premiereDate, ageRating, language, coverImageUrl, status } = parsed.data;

  try {
    await db.insert(shows).values({
      title,
      slug: slugify(title),
      subtitle: subtitle || null,
      shortDescription: shortDescription || null,
      synopsis: synopsis || null,
      fullDescription: fullDescription || null,
      durationMinutes: durationMinutes ?? null,
      premiereDate: premiereDate || null,
      ageRating: ageRating || null,
      language: language || null,
      coverImageUrl: coverImageUrl || null,
      status,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar espetáculo. O título pode já estar em uso.");
  }
}

// ─── Credit Role ───────────────────────────────────────────────────────────

export const createCreditRoleSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  description: z.string().optional().or(z.literal("")),
  department: z.enum([
    "artistic", "technical", "production",
    "accessibility", "music", "communication", "other",
  ]).default("other"),
  sortOrder: z.coerce.number().int().default(0),
});

export type CreateCreditRoleInput = z.infer<typeof createCreditRoleSchema>;

export async function createCreditRole(
  data: CreateCreditRoleInput
): Promise<ActionResponse> {
  const parsed = createCreditRoleSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  const { name, description, department, sortOrder } = parsed.data;

  try {
    await db.insert(creditRoles).values({
      name,
      slug: slugify(name),
      description: description || null,
      department,
      sortOrder,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar função de crédito. O nome pode já estar em uso.");
  }
}
