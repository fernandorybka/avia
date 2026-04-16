import { db } from "@/db";
import { templates, documentGenerations, documentGenerationValues } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { generateDocx } from "@/lib/docx-utils";
import { NextRequest } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getR2KeyFromPointer, getTemplateBufferFromR2 } from "@/lib/r2";
import { auth } from "@clerk/nextjs/server";
import { decryptFieldValue } from "@/lib/field-encryption";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");
    const generationId = searchParams.get("generationId");

    if (!templateId || !generationId) {
      return new Response("Missing parameters", { status: 400 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const [[template], [generation], values] = await Promise.all([
      db.select().from(templates).where(and(
        eq(templates.id, templateId),
        eq(templates.userId, userId)
      )).limit(1),
      db.select().from(documentGenerations).where(and(
        eq(documentGenerations.id, generationId),
        eq(documentGenerations.userId, userId)
      )).limit(1),
      db.select().from(documentGenerationValues).where(eq(documentGenerationValues.generationId, generationId))
    ]);

    if (!template || !generation) {
      return new Response("Template or Generation not found", { status: 404 });
    }

    const valuesRecord: Record<string, string> = {};
    for (const v of values) {
      valuesRecord[v.fieldKey] = decryptFieldValue(v.fieldValue);
    }

    if (!template.storageUrl) {
      return new Response("Template buffer is missing", { status: 500 });
    }

    const buffer = await getTemplateBufferFromR2(getR2KeyFromPointer(template.storageUrl));

    const docxBuffer = generateDocx(buffer, valuesRecord);

    const safeTemplateName = template.name.replace(/[^a-zA-Z0-9]/g, '_');
    const safeGenName = generation.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTemplateName}_${safeGenName}.docx`;

    const body = new ArrayBuffer(docxBuffer.byteLength);
    new Uint8Array(body).set(docxBuffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    console.error("API Download error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
