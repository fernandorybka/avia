import "server-only";

import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { BudgetSheetError } from "@/lib/budget-sheet";
import { ProjectAccessError } from "@/lib/project-guard";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Validation errors whose message is safe to show (never echoes a value). */
export class ProjectError extends Error {}

/**
 * Wraps every projects action. Unexpected errors go to Sentry/console with the action
 * name and error class only: DB errors carry query params, and nothing from this
 * module's data may reach logs or telemetry.
 */
export async function runProjectAction<T>(name: string, action: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await action();
    revalidatePath("/projetos", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ProjectError || error instanceof BudgetSheetError || error instanceof ProjectAccessError) {
      return { ok: false, error: error.message };
    }

    const errorType = error instanceof Error ? error.constructor.name : typeof error;
    const report = new Error(`[projects] ${name} failed (${errorType})`);
    if (error instanceof Error && error.stack) {
      report.stack = `${report.message}\n${error.stack.split("\n").slice(1).join("\n")}`;
    }
    Sentry.captureException(report, { tags: { action: name, module: "projects" } });
    console.error(report.message);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
}

export function requireText(value: unknown, label: string, maxLength: number): string {
  const text = typeof value === "string" ? value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim() : "";
  if (!text) throw new ProjectError(`${label} não pode ficar vazio.`);
  if (text.length > maxLength) throw new ProjectError(`${label} muito longo.`);
  return text;
}

export function requireId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new ProjectError("Registro não encontrado.");
  }
  return value;
}

/** Postgres unique violation, whether raw or wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } } | null;
  return candidate?.code === "23505" || candidate?.cause?.code === "23505";
}
