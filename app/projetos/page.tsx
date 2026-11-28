import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectsHeading } from "@/components/projects/ProjectsHeading";
import { requireProjectManager } from "@/lib/project-guard";
import { getOwnedProjects } from "@/services/project-services";

export default async function ProjectsPage() {
  const userId = await requireProjectManager();
  const projects = await getOwnedProjects(userId);

  return (
    <>
      <ProjectsHeading />
      <ProjectList projects={projects} />
    </>
  );
}
