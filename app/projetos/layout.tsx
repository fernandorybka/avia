import { notFound } from "next/navigation";
import { connection } from "next/server";
import { canCurrentUserManageProjects } from "@/lib/admin";

// Decrypted project data is rendered per request: never add "use cache" in this module
export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  await connection();

  if (!(await canCurrentUserManageProjects())) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <main className="container mx-auto px-4 pt-24">
        <div className="max-w-5xl mx-auto space-y-5">{children}</div>
      </main>
    </div>
  );
}
