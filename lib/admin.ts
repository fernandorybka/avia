import "server-only";

import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { merchMembers } from "@/db/schema";

function getAdminEmails(): Set<string> {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured);
}

// currentUser() hits the Clerk API on every call; cache() makes it one call per request
const getCurrentUserEmails = cache(async (): Promise<string[]> => {
  const user = await currentUser();
  return user?.emailAddresses.map((entry) => entry.emailAddress.toLowerCase()) ?? [];
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
