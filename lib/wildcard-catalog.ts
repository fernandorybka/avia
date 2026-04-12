function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/ /g, "_");
}

type CatalogItem = {
  key: string;
  aliases: string[];
};

const CATALOG: CatalogItem[] = [
  { key: "NOME", aliases: [] },
  { key: "NOME_COMPLETO", aliases: [] },
  { key: "CPF", aliases: [] },
  { key: "RG", aliases: ["IDENTIDADE"] },
  { key: "CNPJ", aliases: [] },
  { key: "FUNCAO", aliases: ["CARGO"] },
  { key: "PROJETO", aliases: [] },
  { key: "PROJETO_NOME", aliases: [] },
  { key: "PROPONENTE", aliases: [] },
  { key: "PROPONENTE_NOME", aliases: [] },
  { key: "CIDADE", aliases: ["MUNICIPIO", "MUNICÍPIO"] },
  { key: "ESTADO", aliases: ["UF"] },
  { key: "CEP", aliases: ["CODIGO_POSTAL", "CÓDIGO_POSTAL"] },
  { key: "ENDERECO_COMPLETO", aliases: ["ENDERECO"] },
  { key: "ENDERECO_CNPJ", aliases: [] },
  { key: "ENDERECO_NUMERO_CNPJ", aliases: [] },
  { key: "ENDERECO_RUA", aliases: ["LOGRADOURO"] },
  { key: "ENDERECO_NUMERO", aliases: [] },
  { key: "ENDERECO_BAIRRO", aliases: [] },
  { key: "ENDERECO_COMPLEMENTO", aliases: [] },
  { key: "ENDERECO_CIDADE", aliases: ["CIDADE_ENDERECO"] },
  { key: "ENDERECO_ESTADO", aliases: ["ESTADO_ENDERECO", "UF_ENDERECO"] },
  { key: "ENDERECO_CEP", aliases: ["CEP_ENDERECO"] },
  { key: "DIA", aliases: ["DIA_ATUAL"] },
  { key: "MES", aliases: ["MÊS"] },
  { key: "MES_ATUAL", aliases: ["MÊS_ATUAL"] },
  { key: "ANO", aliases: ["ANO_ATUAL"] },
  { key: "TELEFONE", aliases: ["CONTATO", "CELULAR"] },
  { key: "EMAIL", aliases: ["E_MAIL", "CORREIO_ELETRONICO"] },
];

const ALIAS_TO_CANONICAL = new Map<string, string>();

for (const item of CATALOG) {
  ALIAS_TO_CANONICAL.set(normalizeKey(item.key), normalizeKey(item.key));
  for (const alias of item.aliases) {
    ALIAS_TO_CANONICAL.set(normalizeKey(alias), normalizeKey(item.key));
  }
}

export function resolveCanonicalWildcardKey(input: string): string {
  const normalized = normalizeKey(input);
  return ALIAS_TO_CANONICAL.get(normalized) ?? normalized;
}

export function getCanonicalWildcardKeys(): string[] {
  return CATALOG.map((item) => normalizeKey(item.key));
}
