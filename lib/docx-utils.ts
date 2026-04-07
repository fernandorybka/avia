import mammoth from "mammoth";
import { isValidWildcardKey, normalizeWildcardKey } from "@/lib/sanitize";

export async function parseDocxPlaceholders(buffer: Buffer) {
  try {
    const { value: text } = await mammoth.extractRawText({ buffer });
    
    // \p{L} = any Unicode letter (accents, tildes, ç, etc.), \p{N} = any Unicode digit
    const regex = /##([\p{L}\p{N}_ ]+)##/gu;
    const matches = text.matchAll(regex);
    
    const placeholders = new Set<string>();
    const fieldKeys = new Set<string>();
    
    // Always include NOME as per requirements
    placeholders.add("##NOME##");
    fieldKeys.add("NOME");

    for (const match of matches) {
      const fullPlaceholder = match[0];
      const key = match[1];

      // Skip keys that don't pass the validation rules
      if (!isValidWildcardKey(key)) continue;

      placeholders.add(fullPlaceholder);
      fieldKeys.add(key);
    }

    return {
      text,
      placeholders: Array.from(placeholders).map(p => {
        const key = p.replace(/##/g, "");
        return {
          placeholder: p,
          fieldKey: normalizeWildcardKey(key)
        };
      })
    };
  } catch (error) {
    console.error("Error parsing docx:", error);
    throw new Error("Failed to parse .docx file. Ensure it is a valid format.");
  }
}

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export function generateDocx(buffer: Buffer, values: Record<string, string>): Buffer {
  const zip = new PizZip(buffer);

  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "##", end: "##" }
    });

    doc.render(values);

    return doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }) as Buffer;
  } catch (error: any) {
    // Docxtemplater throws structured errors with a `properties.errors` array
    if (error?.properties?.errors?.length) {
      const details = error.properties.errors
        .map((e: any) => e?.properties?.explanation ?? e?.message ?? String(e))
        .join("; ");
      throw new Error(
        `Erro de formatação no modelo: o documento contém wildcards malformados ou tags inválidas. Verifique se todos os campos seguem o padrão ##campo## (com ## dos dois lados e sem caracteres especiais). Detalhes: ${details}`
      );
    }
    throw new Error(
      "Erro ao processar o modelo. Verifique se o arquivo .docx está íntegro e se os wildcards estão corretamente formatados com ## dos dois lados."
    );
  }
}

/**
 * Normalizes all wildcards within a DOCX buffer.
 * Replaces tags like ##nome Máximo## with ##NOME_MAXIMO##.
 */
export async function normalizeDocxContent(buffer: Buffer): Promise<Buffer> {
  let currentBuffer = buffer;
  const zip = new PizZip(currentBuffer);
  
  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "##", end: "##" }
    });

    const { value: text } = await mammoth.extractRawText({ buffer });
    const regex = /##([\p{L}\p{N}_ ]+)##/gu;
    const matches = Array.from(text.matchAll(regex));
    
    if (matches.length === 0) return buffer;

    const normalizationMap: Record<string, string> = {};
    for (const match of matches) {
      const originalKey = match[1] as string;
      if (isValidWildcardKey(originalKey)) {
        const normalizedKey = normalizeWildcardKey(originalKey);
        // We want to replace ##dirty## with ##CLEAN##
        // docxtemplater will replace the content between delimiters
        normalizationMap[originalKey] = `##${normalizedKey}##`;
      }
    }

    if (Object.keys(normalizationMap).length === 0) return buffer;

    doc.render(normalizationMap);

    return doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }) as Buffer;
  } catch (error) {
    console.error("Error normalizing docx content:", error);
    // If normalization fails, return original buffer as fallback
    return buffer;
  }
}
