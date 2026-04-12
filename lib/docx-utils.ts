import PizZip from "pizzip";
import { isValidWildcardKey, normalizeWildcardKey } from "@/lib/sanitize";
import { resolveCanonicalWildcardKey } from "@/lib/wildcard-catalog";

const BROAD_PLACEHOLDER_REGEX = /##((?:(?!##)[\s\S])*)##/gu;

export async function parseDocxPlaceholders(buffer: Buffer) {
  try {
    const zip = new PizZip(buffer);
    const files = Object.keys(zip.files);
    const targetXmlFiles = files.filter((filePath) => {
      if (!filePath.startsWith("word/") || !filePath.endsWith(".xml")) return false;
      if (filePath.includes("/_rels/")) return false;
      return /word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(filePath);
    });
    
    const placeholders = new Set<string>();
    const extractedTextParts: string[] = [];
    
    // Always include NOME as per requirements
    placeholders.add("##NOME##");

    for (const xmlPath of targetXmlFiles) {
      const file = zip.file(xmlPath);
      if (!file) continue;
      const rawXml = file.asText();
      const xmlText = extractVisibleTextFromXml(rawXml);
      extractedTextParts.push(xmlText);

      const xmlPlaceholders = extractPlaceholdersFromText(xmlText);

      for (const placeholder of xmlPlaceholders) {
        placeholders.add(placeholder);
      }
    }

    const text = extractedTextParts
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const placeholdersByFieldKey = new Map<string, { placeholder: string; fieldKey: string }>();

    for (const p of placeholders) {
      const key = p.replace(/##/g, "");
      const fieldKey = resolveCanonicalWildcardKey(normalizeWildcardKey(key));

      if (!placeholdersByFieldKey.has(fieldKey)) {
        placeholdersByFieldKey.set(fieldKey, {
          placeholder: p,
          fieldKey,
        });
      }
    }

    const parsedPlaceholders = Array.from(placeholdersByFieldKey.values());

    return {
      text,
      placeholders: parsedPlaceholders,
    };
  } catch (error) {
    console.error("Error parsing docx:", error);
    throw new Error(
      "Nao foi possivel ler o arquivo .docx. Verifique se o documento nao esta corrompido e tente novamente."
    );
  }
}

export async function validateDocxTemplateFormatting(buffer: Buffer): Promise<{
  isValid: boolean;
  unresolvedPlaceholders: string[];
  invalidPlaceholders: string[];
  hasDanglingDelimiters: boolean;
}> {
  const parsed = await parseDocxPlaceholders(buffer);
  const probeValues: Record<string, string> = {};

  parsed.placeholders.forEach((item, index) => {
    probeValues[item.fieldKey] = `__AVIA_PROBE_${index}__`;
  });

  const probeBuffer = generateDocx(buffer, probeValues);
  const probeParsed = await parseDocxPlaceholders(probeBuffer);
  const normalizedProbeText = normalizeDelimiterNoise(probeParsed.text);
  const unresolved = new Set<string>();
  const invalid = new Set<string>();

  for (const match of normalizedProbeText.matchAll(BROAD_PLACEHOLDER_REGEX)) {
    const sanitized = sanitizeExtractedWildcardKey(match[1]);
    if (!isValidWildcardKey(sanitized)) {
      if (sanitized) invalid.add(sanitized);
      continue;
    }
    unresolved.add(normalizeWildcardKey(sanitized));
  }

  const delimiterCount = normalizedProbeText.match(/##/g)?.length ?? 0;
  const hasDanglingDelimiters = delimiterCount % 2 !== 0;

  return {
    isValid: unresolved.size === 0 && invalid.size === 0 && !hasDanglingDelimiters,
    unresolvedPlaceholders: Array.from(unresolved),
    invalidPlaceholders: Array.from(invalid),
    hasDanglingDelimiters,
  };
}

/**
 * Extract placeholders from plain text rebuilt from DOCX XML.
 */
function extractPlaceholdersFromText(text: string): Set<string> {
  const placeholders = new Set<string>();
  const normalizedText = normalizeDelimiterNoise(text);

  for (const match of normalizedText.matchAll(BROAD_PLACEHOLDER_REGEX)) {
    const sanitized = sanitizeExtractedWildcardKey(match[1]);
    if (!isValidWildcardKey(sanitized)) continue;
    placeholders.add(`##${sanitized}##`);
  }

  return placeholders;
}

function normalizeDelimiterNoise(text: string): string {
  const hashLikeChars = /[＃﹟#]/g;
  let result = text.replace(hashLikeChars, "#");
  const betweenHashes = /#(?:[\s\u00A0\u200B-\u200D\u2060\uFEFF])+#/g;
  let previous = "";

  while (result !== previous) {
    previous = result;
    result = result.replace(betweenHashes, "##");
  }

  return result;
}

function extractVisibleTextFromXml(xml: string): string {
  let text = xml;

  // Preserve structural separators before removing tags.
  text = text.replace(/<w:tab\/>/g, "\t");
  text = text.replace(/<w:(?:br|cr)\s*\/?>/g, "\n");
  text = text.replace(/<\/w:p>/g, "\n");
  text = text.replace(/<\/w:tr>/g, "\n");
  text = text.replace(/<\/w:tc>/g, "\t");

  // Keep only text content.
  text = text.replace(/<[^>]+>/g, "");
  text = decodeXmlEntities(text);

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t+/g, "\t")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)));
}

function sanitizeExtractedWildcardKey(key: string): string {
  return key
    .replace(/<[^>]+>/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

  const valuesByNormalizedKey: Record<string, string> = {};

  // Canonicalize incoming keys (e.g., MÊS / MES / MÊS ATUAL => same normalized key).
  for (const [key, value] of Object.entries(values)) {
    const normalizedKey = resolveCanonicalWildcardKey(normalizeWildcardKey(key));
    valuesByNormalizedKey[normalizedKey] = value;
  }

  for (const xmlPath of targetXmlFiles) {
    const file = zip.file(xmlPath);
    if (!file) continue;
    let xml = file.asText();

    xml = xml.replace(BROAD_PLACEHOLDER_REGEX, (fullMatch, rawKey: string) => {
      const sanitizedKey = sanitizeExtractedWildcardKey(rawKey);
      if (!isValidWildcardKey(sanitizedKey)) return fullMatch;
      const normalizedPlaceholderKey = resolveCanonicalWildcardKey(normalizeWildcardKey(sanitizedKey));
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

const SLOT_REGEX = /_{3,}/g;

export function extractDocxSlotSummary(buffer: Buffer): {
  textWithSlots: string;
  slotCount: number;
} {
  const zip = new PizZip(buffer);
  const files = Object.keys(zip.files);
  const targetXmlFiles = files.filter((filePath) => {
    if (!filePath.startsWith("word/") || !filePath.endsWith(".xml")) return false;
    if (filePath.includes("/_rels/")) return false;
    return /word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(filePath);
  });

  let slotIndex = 0;
  const parts: string[] = [];

  for (const xmlPath of targetXmlFiles) {
    const file = zip.file(xmlPath);
    if (!file) continue;
    const xml = file.asText();
    const textWithMarkers = extractVisibleTextFromXml(xml).replace(SLOT_REGEX, () => {
      slotIndex += 1;
      return `[SLOT_${slotIndex}]`;
    });
    parts.push(textWithMarkers);
  }

  return {
    textWithSlots: parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim(),
    slotCount: slotIndex,
  };
}

export function applyDocxSlotWildcards(buffer: Buffer, slotKeys: string[]): Buffer {
  const zip = new PizZip(buffer);
  const files = Object.keys(zip.files);
  const targetXmlFiles = files.filter((filePath) => {
    if (!filePath.startsWith("word/") || !filePath.endsWith(".xml")) return false;
    if (filePath.includes("/_rels/")) return false;
    return /word\/(document|header\d*|footer\d*|footnotes|endnotes|comments)\.xml$/.test(filePath);
  });

  let slotIndex = 0;

  for (const xmlPath of targetXmlFiles) {
    const file = zip.file(xmlPath);
    if (!file) continue;
    let xml = file.asText();

    xml = xml.replace(/<w:t[^>]*>[\s\S]*?<\/w:t>/g, (textNode) => {
      return textNode.replace(SLOT_REGEX, (slotMatch) => {
        const key = slotKeys[slotIndex];
        slotIndex += 1;
        if (!key) return slotMatch;
        return `##${resolveCanonicalWildcardKey(key)}##`;
      });
    });

    zip.file(xmlPath, xml);
  }

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
