import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import mammoth from "mammoth";
import PizZip from "pizzip";

import {
  generateDocx,
  parseDocxPlaceholders,
  unsplitDocxTags,
  validateDocxTemplateFormatting,
} from "./docx-utils";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/files");

const valuesFor01: Record<string, string> = {
  NOME: "Pesosa Tal",
  "CARGO SERVICO PRESTADO": "Cargo tal",
  CIDADE: "Recife",
  CIM: "1234",
  CPF: "123.123.123/12",
  DIA: "10",
  EDITAL: "Do estado",
  "ENDERECO COMPLETO": "rua tal da cidade tal",
  FUNCAO: "Função da Pessoa",
  MES: "março",
  NIT: "123456",
  "NOME PF": "Pessoa Tal",
  "NOME RUBRICA": "Nome da Rubrica",
  PARCELAS: "1",
  PROJETO: "Projeto tal",
  PROPONENTE: "Proponente",
  QNT: "1",
  RG: "123456 SSP/PE",
  RUBRICA: "123",
  "SERVICO PRESTADO": "Serviço tal",
  "TELEFONE EMAIL": "1234 - abc@abc.com",
  UNIDADE: "12",
  "VALOR PAGAMENTO": "10,00",
  "VALOR PAGAMENTO EXTENSO": "dez reais",
  "VALOR TOTAL": "10,00",
  "VALOR UNITARIO": "10,00",
};

const valuesFor02And03: Record<string, string> = {
  NOME: "Fernando",
  CIDADE: "Recife",
  CPF: "123.123.123/12",
  DIA: "10",
  "ENDERECO BAIRRO": "Boa Vista",
  "ENDERECO CEP": "12345-789",
  "ENDERECO CIDADE": "Recife",
  "ENDERECO COMPLEMENTO": "ap 123",
  "ENDERECO COMPLETO": "rua tal da cidade tal",
  "ENDERECO ESTADO": "Pernambuco",
  "ENDERECO NUMERO": "123",
  "ENDERECO RUA": "RUA",
  FUNCAO: "Função da Pessoa",
  PROJETO: "Projeto tal",
  "PROJETO NOME": "Projeto",
  PROPONENTE: "Proponente",
  "PROPONENTE NOME": "Alguém Misterioso",
  RG: "123456 SSP/PE",
};

function makeDocxBuffer(files: Record<string, string>): Buffer {
  const zip = new PizZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  return zip.generate({ type: "nodebuffer", compression: "DEFLATE" }) as Buffer;
}

function readZipTextFile(buffer: Buffer, path: string): string {
  const zip = new PizZip(buffer);
  const file = zip.file(path);

  if (!file) {
    throw new Error(`Expected file in zip: ${path}`);
  }

  return file.asText();
}

async function readFixtureDocx(name: string): Promise<Buffer> {
  return await readFile(path.join(FIXTURES_DIR, name));
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return normalizeText(value);
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

test("parseDocxPlaceholders reads placeholders and visible text from Word XML", async () => {
  const buffer = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>Contrato ##NOME COMPLETO##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##NOME!##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
    "word/header1.xml": "<w:hdr><w:p><w:r><w:t>Cliente: ＃＃MÊS ATUAL＃＃</w:t></w:r></w:p></w:hdr>",
    "word/footer1.xml": "<w:ftr><w:p><w:r><w:t>Fim</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>##CIDADE##</w:t></w:r></w:p></w:ftr>",
    "word/_rels/document.xml.rels": "<Relationships />",
  });

  const parsed = await parseDocxPlaceholders(buffer);
  const byPlaceholder = new Map(parsed.placeholders.map((item) => [item.placeholder, item.fieldKey]));

  assert.equal(byPlaceholder.get("##NOME##"), "NOME");
  assert.equal(byPlaceholder.get("##NOME COMPLETO##"), "NOME_COMPLETO");
  assert.equal(byPlaceholder.get("##MÊS ATUAL##"), "MES_ATUAL");
  assert.equal(byPlaceholder.get("##CIDADE##"), "CIDADE");
  assert.equal(byPlaceholder.has("##NOME!##"), false);

  assert.match(parsed.text, /Contrato ##NOME COMPLETO##/);
  assert.match(parsed.text, /Cliente: ＃＃MÊS ATUAL＃＃/);
  assert.match(parsed.text, /Fim\n##CIDADE##/);
});

test("parseDocxPlaceholders accepts coringa variants (minusculas, espacos, acentos e cedilha)", async () => {
  const buffer = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>##nome##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##nome completo##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##ENDEREÇO CIDADE##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##FUNÇÃO##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##ação ç##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>＃＃mês atual＃＃</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const parsed = await parseDocxPlaceholders(buffer);
  const fieldKeys = new Set(parsed.placeholders.map((item) => item.fieldKey));

  assert.equal(fieldKeys.has("NOME"), true);
  assert.equal(fieldKeys.has("NOME_COMPLETO"), true);
  assert.equal(fieldKeys.has("ENDERECO_CIDADE"), true);
  assert.equal(fieldKeys.has("FUNCAO"), true);
  assert.equal(fieldKeys.has("ACAO_C"), true);
  assert.equal(fieldKeys.has("MES_ATUAL"), true);
});

test("generateDocx substitutes coringas independent of acento/case/espaco", () => {
  const template = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>##ENDEREÇO CIDADE##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##função##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##MÊS ATUAL##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const generated = generateDocx(template, {
    "endereco cidade": "Recife",
    FUNCAO: "Coordenador",
    "mes atual": "abril",
  });

  const xml = readZipTextFile(generated, "word/document.xml");
  assert.match(xml, /Recife/);
  assert.match(xml, /Coordenador/);
  assert.match(xml, /abril/);
  assert.equal(/##[^#]+##/.test(xml), false);
});

test("parseDocxPlaceholders ignores invalid coringas", async () => {
  const buffer = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>##NOME-INVALIDO##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##CPF/CNPJ##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##EMAIL@##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>####</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const parsed = await parseDocxPlaceholders(buffer);
  const fieldKeys = new Set(parsed.placeholders.map((item) => item.fieldKey));

  assert.equal(fieldKeys.has("NOME_INVALIDO"), false);
  assert.equal(fieldKeys.has("CPF_CNPJ"), false);
  assert.equal(fieldKeys.has("EMAIL"), false);
});

test("parseDocxPlaceholders deduplicates coringas by normalized key", async () => {
  const buffer = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>##cep##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##CeP##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##CEP##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const parsed = await parseDocxPlaceholders(buffer);
  const cepCount = parsed.placeholders.filter((item) => item.fieldKey === "CEP").length;

  assert.equal(cepCount, 1);
});

test("parseDocxPlaceholders with real snippet keeps one CEP key", async () => {
  const buffer = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>##cep##,representante da empresa/Entidade ##ENTIDADE##, inscrita no CNPJ sob o nº ##CNPJ##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>##ENDEREÇO_CNPJ##, nº ##ENDEREÇO_NUMERO_CNPJ##, Complemento ##COMPLEMENTO##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Bairro ##BAIRRO##, Cidade ##CIDADE##, Estado ##ESTADO##, CEP ##CeP##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const parsed = await parseDocxPlaceholders(buffer);
  const fieldKeys = parsed.placeholders.map((item) => item.fieldKey);
  const cepCount = fieldKeys.filter((k) => k === "CEP").length;

  assert.equal(cepCount, 1);
  assert.equal(fieldKeys.includes("ENTIDADE"), true);
  assert.equal(fieldKeys.includes("CNPJ"), true);
  assert.equal(fieldKeys.includes("ENDERECO_CNPJ"), true);
  assert.equal(fieldKeys.includes("ENDERECO_NUMERO_CNPJ"), true);
  assert.equal(fieldKeys.includes("COMPLEMENTO"), true);
  assert.equal(fieldKeys.includes("BAIRRO"), true);
  assert.equal(fieldKeys.includes("CIDADE"), true);
  assert.equal(fieldKeys.includes("ESTADO"), true);
});

test("generateDocx replaces CEP in all case variants", () => {
  const template = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>CEP inicial: ##cep##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>CEP final: ##CeP##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const generated = generateDocx(template, {
    CEP: "12345-789",
  });

  const xml = readZipTextFile(generated, "word/document.xml");

  assert.match(xml, /CEP inicial: 12345-789/);
  assert.match(xml, /CEP final: 12345-789/);
  assert.equal(/##[^#]+##/.test(xml), false);
});

test("generateDocx replaces placeholders using normalized keys and escapes XML", () => {
  const template = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>Nome: ##NOME##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Mes: ##MÊS ATUAL##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Opcional: ##NAO_EXISTE##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const generated = generateDocx(template, {
    nome: "Ana & Bia\nSouza",
    "MES ATUAL": "Abril",
  });

  const xml = readZipTextFile(generated, "word/document.xml");

  assert.match(xml, /Nome: Ana &amp; Bia<\/w:t><w:br\/><w:t>Souza/);
  assert.match(xml, /Mes: Abril/);
  assert.match(xml, /##NAO_EXISTE##/);
});

test("unsplitDocxTags fixes placeholders split by Word runs", () => {
  const template = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body><w:p>",
      "<w:r><w:t>#</w:t></w:r>",
      "<w:r><w:t>#N</w:t></w:r>",
      "<w:r><w:t>OME##</w:t></w:r>",
      "</w:p><w:p>",
      "<w:r><w:t>##C</w:t></w:r>",
      "<w:r><w:t>IDADE##</w:t></w:r>",
      "</w:p></w:body></w:document>",
    ].join(""),
    "word/header1.xml": "<w:hdr><w:p><w:r><w:t>##M</w:t></w:r><w:r><w:t>ES##</w:t></w:r></w:p></w:hdr>",
  });

  const fixed = unsplitDocxTags(template);
  const documentXml = readZipTextFile(fixed, "word/document.xml");
  const headerXml = readZipTextFile(fixed, "word/header1.xml");

  assert.match(documentXml, /##NOME##/);
  assert.match(documentXml, /##CIDADE##/);
  assert.match(headerXml, /##MES##/);
});

test("validateDocxTemplateFormatting approves fixture templates 01/02/03", async () => {
  const buffers = await Promise.all([
    readFixtureDocx("01.docx"),
    readFixtureDocx("02.docx"),
    readFixtureDocx("03.docx"),
  ]);

  for (const buffer of buffers) {
    const result = await validateDocxTemplateFormatting(buffer);
    assert.equal(result.isValid, true);
    assert.equal(result.unresolvedPlaceholders.length, 0);
    assert.equal(result.invalidPlaceholders.length, 0);
    assert.equal(result.hasDanglingDelimiters, false);
  }
});

test("validateDocxTemplateFormatting flags dangling wildcard delimiters", async () => {
  const malformed = makeDocxBuffer({
    "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>CPF: ##CPF</w:t></w:r></w:p></w:body></w:document>",
  });

  const result = await validateDocxTemplateFormatting(malformed);
  assert.equal(result.isValid, false);
  assert.equal(result.hasDanglingDelimiters, true);
  assert.equal(result.invalidPlaceholders.length, 0);
});

test("validateDocxTemplateFormatting flags invalid coringa format", async () => {
  const malformed = makeDocxBuffer({
    "word/document.xml": [
      "<w:document><w:body>",
      "<w:p><w:r><w:t>Nome: ##NOME##</w:t></w:r></w:p>",
      "<w:p><w:r><w:t>Documento: ##CPF/CNPJ##</w:t></w:r></w:p>",
      "</w:body></w:document>",
    ].join(""),
  });

  const result = await validateDocxTemplateFormatting(malformed);
  assert.equal(result.isValid, false);
  assert.equal(result.hasDanglingDelimiters, false);
  assert.deepEqual(result.unresolvedPlaceholders, []);
  assert.equal(result.invalidPlaceholders.includes("CPF/CNPJ"), true);
});

test("fixture 01: parse placeholders and generated output match expected result", async () => {
  const [templateBuffer, expectedBuffer] = await Promise.all([
    readFixtureDocx("01.docx"),
    readFixtureDocx("01-result.docx"),
  ]);

  const parsed = await parseDocxPlaceholders(templateBuffer);

  assert.ok(parsed.placeholders.length > 0);
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "NOME"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "CPF"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "VALOR_PAGAMENTO"));

  const generated = generateDocx(templateBuffer, valuesFor01);
  const [generatedText, expectedText] = await Promise.all([
    extractDocxText(generated),
    extractDocxText(expectedBuffer),
  ]);

  assert.equal(generatedText, expectedText);
  assert.equal(/##[^#]+##/.test(generatedText), false);
});

test("fixture 02: parse placeholders and generated output match expected result", async () => {
  const [templateBuffer, expectedBuffer] = await Promise.all([
    readFixtureDocx("02.docx"),
    readFixtureDocx("02-result.docx"),
  ]);

  const parsed = await parseDocxPlaceholders(templateBuffer);

  assert.ok(parsed.placeholders.length > 0);
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "NOME"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "CPF"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "ENDERECO_COMPLETO"));

  const generated = generateDocx(templateBuffer, valuesFor02And03);
  const [generatedText, expectedText] = await Promise.all([
    extractDocxText(generated),
    extractDocxText(expectedBuffer),
  ]);

  assert.equal(generatedText, expectedText);
  assert.equal(/##[^#]+##/.test(generatedText), false);
});

test("fixture 03: parse placeholders and generated output match expected result", async () => {
  const [templateBuffer, expectedBuffer] = await Promise.all([
    readFixtureDocx("03.docx"),
    readFixtureDocx("03-result.docx"),
  ]);

  const parsed = await parseDocxPlaceholders(templateBuffer);

  assert.ok(parsed.placeholders.length > 0);
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "NOME"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "CPF"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "ENDERECO_RUA"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "ENDERECO_NUMERO"));
  assert.ok(parsed.placeholders.some((p) => p.fieldKey === "PROPONENTE_NOME"));

  const generated = generateDocx(templateBuffer, valuesFor02And03);
  const [generatedText, expectedText] = await Promise.all([
    extractDocxText(generated),
    extractDocxText(expectedBuffer),
  ]);

  assert.equal(generatedText, expectedText);
  assert.equal(/##[^#]+##/.test(generatedText), false);
});
