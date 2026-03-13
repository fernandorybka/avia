"use server";

import { z } from "zod";
import { db } from "@/db";
import { countries, states, cities } from "@/db/schema";
import { actionSuccess, actionError, fromZodError, ActionResponse } from "@/services/commons/action-response";

// ─── Country ───────────────────────────────────────────────────────────────

export const createCountrySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(120),
  code: z.string().max(10).optional().or(z.literal("")),
});

export type CreateCountryInput = z.infer<typeof createCountrySchema>;

export async function createCountry(
  data: CreateCountryInput
): Promise<ActionResponse> {
  const parsed = createCountrySchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.insert(countries).values({
      name: parsed.data.name,
      code: parsed.data.code || null,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar país. O nome pode já existir.");
  }
}

// ─── State ─────────────────────────────────────────────────────────────────

export const createStateSchema = z.object({
  countryId: z.coerce.number({ message: "País é obrigatório" }).int().positive("País é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório").max(120),
  code: z.string().max(10).optional().or(z.literal("")),
});

export type CreateStateInput = z.infer<typeof createStateSchema>;

export async function createState(
  data: CreateStateInput
): Promise<ActionResponse> {
  const parsed = createStateSchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.insert(states).values({
      countryId: parsed.data.countryId,
      name: parsed.data.name,
      code: parsed.data.code || null,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar estado.");
  }
}

// ─── City ──────────────────────────────────────────────────────────────────

export const createCitySchema = z.object({
  stateId: z.coerce.number().int().positive().optional().nullable(),
  countryId: z.coerce.number({ message: "País é obrigatório" }).int().positive("País é obrigatório"),
  name: z.string().min(1, "Nome é obrigatório").max(120),
});

export type CreateCityInput = z.infer<typeof createCitySchema>;

export async function createCity(
  data: CreateCityInput
): Promise<ActionResponse> {
  const parsed = createCitySchema.safeParse(data);
  if (!parsed.success) return fromZodError(parsed.error);

  try {
    await db.insert(cities).values({
      stateId: parsed.data.stateId ?? null,
      countryId: parsed.data.countryId,
      name: parsed.data.name,
    });
    return actionSuccess();
  } catch (e) {
    console.error(e);
    return actionError("Erro ao salvar cidade.");
  }
}
