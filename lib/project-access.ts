/** Comma-separated e-mail list from an env var, lowercased (same format as ADMIN_EMAILS). */
export function parseEmailList(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Only verified e-mails count, so nobody gets in by adding someone else's address to their account. */
export function isProjectManager(verifiedEmails: string[], allowList: Set<string>): boolean {
  return verifiedEmails.some((email) => allowList.has(email.toLowerCase()));
}

export function canAccessProject(params: {
  userId: string | null;
  isManager: boolean;
  projectOwnerUserId: string | null;
}): boolean {
  const { userId, isManager, projectOwnerUserId } = params;
  return Boolean(userId && isManager && projectOwnerUserId && projectOwnerUserId === userId);
}
