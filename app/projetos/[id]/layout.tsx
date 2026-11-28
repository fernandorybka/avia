import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { ProjectShellSkeleton } from "@/components/projects/ProjectSkeletons";
import { requireOwnedProjectForRender } from "@/lib/project-guard";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ProjectShellSkeleton />}>
      <OwnedProjectShell params={params}>{children}</OwnedProjectShell>
    </Suspense>
  );
}

async function OwnedProjectShell({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requireOwnedProjectForRender(id).catch(() => null);
  if (!access) {
    notFound();
  }

  return (
    <>
      <ProjectHeader projectId={access.project.id} name={access.project.name} />
      {children}
    </>
  );
}
