import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { budgetVersions } from "@/db/schema";
import { decryptBuffer } from "@/lib/field-encryption";
import { requireOwnedProject } from "@/lib/project-guard";
import { getR2KeyFromPointer, getTemplateBufferFromR2 } from "@/lib/r2";

// No file extension in this path on purpose: proxy.ts skips middleware for URLs ending in .xlsx
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const access = await requireOwnedProject(id).catch(() => null);
  if (!access || !/^[0-9a-f-]{36}$/i.test(versionId)) {
    return new Response("Not found", { status: 404 });
  }

  const [version] = await db
    .select({ storageKey: budgetVersions.storageKey, versionNumber: budgetVersions.versionNumber })
    .from(budgetVersions)
    .where(and(eq(budgetVersions.id, versionId), eq(budgetVersions.projectId, access.project.id), eq(budgetVersions.status, "applied")))
    .limit(1);
  if (!version) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const encrypted = await getTemplateBufferFromR2(getR2KeyFromPointer(version.storageKey));
    const file = decryptBuffer(encrypted);

    // Generic filename: the original one may carry personal data and headers end up in logs
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="orcamento-v${version.versionNumber}.xlsx"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    console.error("[projects] budget download failed");
    return new Response("Não foi possível baixar a planilha.", { status: 500 });
  }
}
