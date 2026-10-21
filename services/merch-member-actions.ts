"use server";

import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { merchMembers } from "@/db/schema";
import { isCurrentUserAdmin } from "@/lib/admin";

type ActionResult = { ok: true } | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function runAdminAction(name: string, action: () => Promise<ActionResult | void>): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) {
    return { ok: false, error: "Só admins podem gerenciar a equipe." };
  }

  try {
    const result = await action();
    revalidatePath("/merch", "layout");
    return result ?? { ok: true };
  } catch (error) {
    Sentry.captureException(error, { tags: { action: name } });
    console.error(`[merch] ${name} failed`, error);
    return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  }
}

export async function addMerchMemberAction(rawEmail: string): Promise<ActionResult> {
  return runAdminAction("addMember", async () => {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return { ok: false, error: "E-mail inválido." };
    }

    const inserted = await db
      .insert(merchMembers)
      .values({ email })
      .onConflictDoNothing()
      .returning({ id: merchMembers.id });

    if (inserted.length === 0) {
      return { ok: false, error: "Esse e-mail já está na equipe." };
    }
  });
}

export async function removeMerchMemberAction(memberId: string): Promise<ActionResult> {
  return runAdminAction("removeMember", async () => {
    await db.delete(merchMembers).where(eq(merchMembers.id, memberId));
  });
}
