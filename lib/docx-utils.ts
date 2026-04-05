import mammoth from "mammoth";

export async function parseDocxPlaceholders(buffer: Buffer) {
  try {
    const { value: text } = await mammoth.extractRawText({ buffer });
    
    const regex = /##([A-Z0-9_]+)##/g;
    const matches = text.matchAll(regex);
    
    const placeholders = new Set<string>();
    const fieldKeys = new Set<string>();
    
    // Always include NOME as per requirements
    placeholders.add("##NOME##");
    fieldKeys.add("NOME");

    for (const match of matches) {
      const fullPlaceholder = match[0];
      const key = match[1];
      
      placeholders.add(fullPlaceholder);
      fieldKeys.add(key);
    }

    return {
      text,
      placeholders: Array.from(placeholders).map(p => ({
        placeholder: p,
        fieldKey: p.replace(/##/g, "")
      }))
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
}
