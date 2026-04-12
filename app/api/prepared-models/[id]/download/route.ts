import { getR2KeyFromPointer, getTemplateBufferFromR2 } from "@/lib/r2";
import { getPreparedTemplateForCurrentUser } from "@/services/prepared-template-services";

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const template = await getPreparedTemplateForCurrentUser(id);

    if (!template) {
      return new Response("Modelo não encontrado.", { status: 404 });
    }

    const key = getR2KeyFromPointer(template.storageUrl);
    const buffer = await getTemplateBufferFromR2(key);

    const safeName = sanitizeFilenamePart(template.slug || template.name || "modelo-pronto");
    const filename = `${safeName || "modelo-pronto"}.docx`;

    const body = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(body).set(buffer);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar modelo pronto:", error);
    return new Response("Erro interno ao baixar modelo.", { status: 500 });
  }
}
