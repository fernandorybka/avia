import "server-only";

import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { canCurrentUserManageProjects } from "@/lib/admin";
import { canAccessProject } from "@/lib/project-access";

/** Thrown when the person can't use the module or the project isn't theirs. Never reveals which. */
export class ProjectAccessError extends Error {
  constructor() {
    super("Projeto não encontrado.");
  }
}

/** Signed-in person on the PROJECT_MANAGER_EMAILS list. Returns their Clerk userId. */
export const requireProjectManager = cache(async (): Promise<string> => {
  const { userId } = await auth();
  if (!userId || !(await canCurrentUserManageProjects())) {
    throw new ProjectAccessError();
  }
  return userId;
});

/**
 * The single gate for anything inside a project: manager list + ownership.
 * Every query that follows must also filter by the returned project id.
 * Actions use this uncached version so a rename is never answered with a stale row.
 */
export async function requireOwnedProject(projectId: string): Promise<{ userId: string; project: typeof projects.$inferSelect }> {
  const userId = await requireProjectManager();
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) {
    throw new ProjectAccessError();
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || !canAccessProject({ userId, isManager: true, projectOwnerUserId: project.ownerUserId })) {
    throw new ProjectAccessError();
  }

  return { userId, project };
}

/** Same check, deduplicated per request for rendering: the project layout and its page both call it. */
export const requireOwnedProjectForRender = cache(requireOwnedProject);
