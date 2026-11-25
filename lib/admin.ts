import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { merchMembers } from "@/db/schema";
import { isProjectManager, parseEmailList } from "@/lib/project-access";

function getAdminEmails(): Set<string> {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured);
}

// currentUser() hits the Clerk API (~0.5 s) on every call; cache() makes it one call per request
const getCurrentUser = cache(() => currentUser());

const getCurrentUserEmails = cache(async (): Promise<string[]> => {
  const user = await getCurrentUser();
  return user?.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()) ?? [];
});

/*
 * Verified e-mails for the projects module (a typo'd or unverified address must not grant access).
 * Every click there is a server action plus a re-render, each needing this check, so the result is
 * also kept per user for a short while. Removing someone from PROJECT_MANAGER_EMAILS takes effect
 * immediately (the list is read on every check); only a change to the Clerk account lags.
 */
const VERIFIED_EMAILS_TTL_MS = 60_000;
const verifiedEmailsByUser = new Map<string, { emails: string[]; expiresAt: number }>();

const getCurrentUserVerifiedEmails = cache(async (): Promise<string[]> => {
  const { userId } = await auth();
  if (!userId) return [];

  const cached = verifiedEmailsByUser.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.emails;

  const user = await getCurrentUser();
  const emails =
    user?.emailAddresses
      .filter((entry) => entry.verification?.status === "verified")
      .map((entry) => entry.emailAddress.toLowerCase()) ?? [];

  if (verifiedEmailsByUser.size > 1000) verifiedEmailsByUser.clear();
  verifiedEmailsByUser.set(userId, { emails, expiresAt: Date.now() + VERIFIED_EMAILS_TTL_MS });
  return emails;
});

export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmails = getAdminEmails();
  const userEmails = await getCurrentUserEmails();

  return userEmails.some((email) => adminEmails.has(email));
}

/** Admins plus people in the merch_members table, who can only use the merch (Lojinha) screens. */
export async function canCurrentUserAccessMerch(): Promise<boolean> {
  const userEmails = await getCurrentUserEmails();
  if (userEmails.length === 0) {
    return false;
  }

  const adminEmails = getAdminEmails();
  if (userEmails.some((email) => adminEmails.has(email))) {
    return true;
  }

  const [member] = await db
    .select({ id: merchMembers.id })
    .from(merchMembers)
    .where(inArray(merchMembers.email, userEmails))
    .limit(1);

  return Boolean(member);
}

/** People listed in PROJECT_MANAGER_EMAILS. Admins are not included automatically. */
export async function canCurrentUserManageProjects(): Promise<boolean> {
  const allowList = parseEmailList(process.env.PROJECT_MANAGER_EMAILS);
  if (allowList.size === 0) {
    return false;
  }

  return isProjectManager(await getCurrentUserVerifiedEmails(), allowList);
}
