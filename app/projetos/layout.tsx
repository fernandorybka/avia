import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { canCurrentUserManageProjects } from "@/lib/admin";
import { ProjectsSkeleton } from "@/components/projects/ProjectsSkeleton";

// Decrypted project data is rendered per request: never add "use cache" in this module.
// The frame renders at once; the access check (and everything below it) streams inside Suspense.
export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-24">
        <div className="max-w-5xl mx-auto space-y-5">
          <Suspense fallback={<ProjectsSkeleton />}>
            <ProjectsAccessGate>{children}</ProjectsAccessGate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function ProjectsAccessGate({ children }: { children: React.ReactNode }) {
  await connection();

  if (!(await canCurrentUserManageProjects())) {
    notFound();
  }

  return children;
}
