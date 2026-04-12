import "server-only";

import { currentUser } from "@clerk/nextjs/server";

function getAdminEmails(): Set<string> {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) {
    return false;
  }

  const adminEmails = getAdminEmails();
  const userEmails = user.emailAddresses.map((entry) => entry.emailAddress.toLowerCase());

  return userEmails.some((email) => adminEmails.has(email));
}
