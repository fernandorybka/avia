import { db } from "@/db";
import { templates, documentGenerations, documentGenerationValues } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateDocx } from "@/lib/docx-utils";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get("templateId");
    const generationId = searchParams.get("generationId");

    if (!templateId || !generationId) {
      return new Response("Missing parameters", { status: 400 });
    }

    const [[template], [generation], values] = await Promise.all([
      db.select().from(templates).where(eq(templates.id, templateId)).limit(1),
      db.select().from(documentGenerations).where(eq(documentGenerations.id, generationId)).limit(1),
      db.select().from(documentGenerationValues).where(eq(documentGenerationValues.generationId, generationId))
    ]);

    if (!template || !generation) {
      return new Response("Template or Generation not found", { status: 404 });
    }

    const valuesRecord: Record<string, string> = {};
    for (const v of values) {
      valuesRecord[v.fieldKey] = v.fieldValue;
    }

    if (!template.storageUrl) {
      return new Response("Template buffer is missing", { status: 500 });
    }

    const buffer = Buffer.from(template.storageUrl, "base64");
    const docxBuffer = generateDocx(buffer, valuesRecord);

    const safeTemplateName = template.name.replace(/[^a-zA-Z0-9]/g, '_');
    const safeGenName = generation.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTemplateName}_${safeGenName}.docx`;

    return new Response(docxBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("API Download error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
