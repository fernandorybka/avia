import mammoth from "mammoth";
import PizZip from "pizzip";
import { isValidWildcardKey, normalizeWildcardKey } from "@/lib/sanitize";

export async function parseDocxPlaceholders(buffer: Buffer) {
  try {
    const cleanedBuffer = unsplitDocxTags(buffer);
    const { value: text } = await mammoth.extractRawText({ buffer: cleanedBuffer });
    const zip = new PizZip(cleanedBuffer);
    const files = Object.keys(zip.files);
    const targetXmlFiles = files.filter(
      (filePath) =>
        filePath.startsWith("word/") &&
        filePath.endsWith(".xml") &&
        !filePath.includes("/_rels/")
    );
    
    // \p{L} = any Unicode letter (accents, tildes, ç, etc.), \p{N} = any Unicode digit
    const regex = /##([\p{L}\p{N}_ ]+)##/gu;
    
    const placeholders = new Set<string>();
    
    // Always include NOME as per requirements
    placeholders.add("##NOME##");

    for (const xmlPath of targetXmlFiles) {
      const file = zip.file(xmlPath);
      if (!file) continue;
      const cleanedXml = cleanXmlTags(file.asText());

      for (const match of cleanedXml.matchAll(regex)) {
        const fullPlaceholder = match[0];
        const key = match[1];

        // Skip keys that don't pass the validation rules
        if (!isValidWildcardKey(key)) continue;

        placeholders.add(fullPlaceholder);
      }
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

/**
 * Removes XML tags that split wildcards (##TAG##).
 * LibreOffice/Word often insert tags like <w:proofErr/> or </w:t><w:t>
 * between characters of a wildcard, breaking docxtemplater.
 */
function cleanXmlTags(xml: string): string {
  // Conservative cleanup: only join placeholders across inline run splits.
  let result = xml.replace(/<w:proofErr [^>]*\/>/g, "");
  result = result.replace(/<w:lang [^>]*\/>/g, "");

  const runBoundary = /<\/w:t><\/w:r><w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>/g;
  let previous = "";

  while (previous !== result) {
    previous = result;

    // Fix split delimiters: # + boundary + # => ##
    result = result.replace(/#<\/w:t><\/w:r><w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>#/g, "##");

    // Fix placeholders split by one inline boundary at a time.
    result = result.replace(
      /##([^#<]*?)<\/w:t><\/w:r><w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>([^#]*?)##/g,
      "##$1$2##"
    );
  }

  // Extra safety: when a run boundary remains between delimiters, strip only that boundary.
  result = result.replace(/##((?:(?!##).)*)##/g, (match) => match.replace(runBoundary, ""));

  return result;
}

/**
 * Processes all XML files in a DOCX buffer to unsplit wildcards.
 */
export function unsplitDocxTags(buffer: Buffer): Buffer {
  const zip = new PizZip(buffer);
  const files = Object.keys(zip.files);

  // Keep scope tight to user-facing text containers.
  const targetFiles = [
    "word/document.xml",
    ...files.filter((f) => f.startsWith("word/header") || f.startsWith("word/footer"))
  ];

  targetFiles.forEach(path => {
    const file = zip.file(path);
    if (!file) return;

    const originalContent = file.asText();
    const cleanedContent = cleanXmlTags(originalContent);
    
    if (originalContent !== cleanedContent) {
      zip.file(path, cleanedContent);
    }
  });

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

export function generateDocx(buffer: Buffer, values: Record<string, string>): Buffer {
  // Keep original XML structure during generation to avoid corrupting tables.
  const zip = new PizZip(buffer);
  const files = Object.keys(zip.files);
  const targetXmlFiles = files.filter(
    (filePath) =>
      filePath.startsWith("word/") &&
      filePath.endsWith(".xml") &&
      !filePath.includes("/_rels/")
  );

  const placeholderRegex = /##([\p{L}\p{N}_ ]+)##/gu;
  const valuesByNormalizedKey: Record<string, string> = {};

  // Canonicalize incoming keys (e.g., MÊS / MES / MÊS ATUAL => same normalized key).
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = normalizeWildcardKey(key);
    valuesByNormalizedKey[normalizedKey] = value;
  }

  for (const xmlPath of targetXmlFiles) {
    const file = zip.file(xmlPath);
    if (!file) continue;
    let xml = file.asText();

    xml = xml.replace(placeholderRegex, (fullMatch, rawKey: string) => {
      if (!isValidWildcardKey(rawKey)) return fullMatch;
      const normalizedPlaceholderKey = normalizeWildcardKey(rawKey);
      const value = valuesByNormalizedKey[normalizedPlaceholderKey];
      if (value === undefined) return fullMatch;
      return escapeXmlText(value).replace(/\r\n|\r|\n/g, "</w:t><w:br/><w:t>");
    });

    zip.file(xmlPath, xml);
  }

  return zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;
}

/**
 * Normalizes all wildcards within a DOCX buffer.
 * Replaces tags like ##nome Máximo## with ##NOME_MAXIMO##.
 */
export async function normalizeDocxContent(buffer: Buffer): Promise<Buffer> {
  // Disabled for safety: previous XML rewrites could break DOCX structure
  // in some table-heavy templates. We normalize only in-memory keys now.
  return buffer;
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
