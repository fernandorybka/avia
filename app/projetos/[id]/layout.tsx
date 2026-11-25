import { notFound } from "next/navigation";
import { ProjectHeader } from "@/components/projects/ProjectHeader";
import { requireOwnedProjectForRender } from "@/lib/project-guard";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
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
