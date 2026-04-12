import "server-only";

import { getCanonicalWildcardKeys, resolveCanonicalWildcardKey } from "@/lib/wildcard-catalog";

type ProviderName = "gemini" | "groq" | "mock";

export type SlotSuggestion = {
  slot: number;
  fieldKey: string;
  confidence: number;
  reason?: string;
};

export type SlotSuggestionResult = {
  slots: SlotSuggestion[];
  suggestedTemplateName: string;
};

export interface TemplateSuggestionProvider {
  suggestSlotKeys(input: { textWithSlots: string; slotCount: number }): Promise<SlotSuggestionResult>;
}

class MockSuggestionProvider implements TemplateSuggestionProvider {
  async suggestSlotKeys(input: { slotCount: number }): Promise<SlotSuggestionResult> {
    const slots = Array.from({ length: input.slotCount }, (_, i) => ({
      slot: i + 1,
      fieldKey: i === 0 ? "NOME" : `CAMPO_${i + 1}`,
      confidence: 0.5,
      reason: "Mock provider",
    }));

    return {
      slots,
      suggestedTemplateName: "Modelo de Documento",
    };
  }
}

class GeminiSuggestionProvider implements TemplateSuggestionProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async suggestSlotKeys(input: { textWithSlots: string; slotCount: number }): Promise<SlotSuggestionResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const canonicalKeys = getCanonicalWildcardKeys();
    const allowedKeysHint = canonicalKeys.join(", ");

    const prompt = [
      "Você é um assistente que padroniza placeholders de documentos de editais.",
      "Receberá um texto com marcadores [SLOT_1], [SLOT_2] etc onde há lacunas (linhas de underscore).",
      "Sua tarefa é sugerir o fieldKey canônico para cada SLOT.",
      "Regras:",
      "1) Responda SOMENTE JSON válido.",
      "2) Use este formato exato: {\"modelName\":\"Nome curto do modelo\",\"slots\":[{\"slot\":1,\"fieldKey\":\"NOME\",\"confidence\":0.91,\"reason\":\"...\"}]}",
      "3) confidence deve ser número entre 0 e 1.",
      "4) Prefira sempre padronização canônica e reutilizável.",
      `5) Quando possível, escolha entre estes fieldKeys canônicos: ${allowedKeysHint}`,
      "6) Se estiver incerto, use nomes genéricos consistentes: CAMPO_1, CAMPO_2, ...",
      "7) Nunca omita slots: retorne todos de 1 até o último.",
      "",
      `slotCount=${input.slotCount}`,
      "texto:",
      input.textWithSlots,
    ].join("\n");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Falha ao chamar Gemini (${response.status}): ${text.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = parseJsonPayload(rawText);
    const slots = Array.isArray(parsed?.slots) ? parsed.slots : [];

    const normalized = slots
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        const slot = Number(obj.slot);
        const fieldKey = String(obj.fieldKey ?? "").trim();
        const confidence = Number(obj.confidence ?? 0);
        const reason = typeof obj.reason === "string" ? obj.reason : undefined;

        if (!Number.isFinite(slot) || slot < 1) return null;
        if (!fieldKey) return null;

        return {
          slot,
          fieldKey: resolveCanonicalWildcardKey(fieldKey),
          confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
          reason,
        } satisfies SlotSuggestion;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      slots: fillMissingSlots(normalized, input.slotCount),
      suggestedTemplateName: sanitizeSuggestedModelName(parsed?.modelName, input.textWithSlots),
    };
  }
}

class GroqSuggestionProvider implements TemplateSuggestionProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model = "llama-3.3-70b-versatile") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async suggestSlotKeys(input: { textWithSlots: string; slotCount: number }): Promise<SlotSuggestionResult> {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const canonicalKeys = getCanonicalWildcardKeys();
    const allowedKeysHint = canonicalKeys.join(", ");

    const prompt = [
      "Você é um assistente que padroniza placeholders de documentos de editais.",
      "Receberá um texto com marcadores [SLOT_1], [SLOT_2] etc onde há lacunas (linhas de underscore).",
      "Sua tarefa é sugerir o fieldKey canônico para cada SLOT.",
      "Regras:",
      "1) Responda SOMENTE JSON válido.",
      "2) Use este formato exato: {\"modelName\":\"Nome curto do modelo\",\"slots\":[{\"slot\":1,\"fieldKey\":\"NOME\",\"confidence\":0.91,\"reason\":\"...\"}]}",
      "3) confidence deve ser número entre 0 e 1.",
      "4) Prefira sempre padronização canônica e reutilizável.",
      `5) Quando possível, escolha entre estes fieldKeys canônicos: ${allowedKeysHint}`,
      "6) Se estiver incerto, use nomes genéricos consistentes: CAMPO_1, CAMPO_2, ...",
      "7) Nunca omita slots: retorne todos de 1 até o último.",
      "",
      `slotCount=${input.slotCount}`,
      "texto:",
      input.textWithSlots,
    ].join("\n");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você extrai campos e responde exclusivamente em JSON válido sem markdown e sem texto extra.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Falha ao chamar Groq (${response.status}): ${text.slice(0, 300)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawText = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseJsonPayload(rawText);
    const slots = Array.isArray(parsed?.slots) ? parsed.slots : [];

    const normalized = slots
      .map((item: unknown) => {
        if (!item || typeof item !== "object") return null;
        const obj = item as Record<string, unknown>;
        const slot = Number(obj.slot);
        const fieldKey = String(obj.fieldKey ?? "").trim();
        const confidence = Number(obj.confidence ?? 0);
        const reason = typeof obj.reason === "string" ? obj.reason : undefined;

        if (!Number.isFinite(slot) || slot < 1) return null;
        if (!fieldKey) return null;

        return {
          slot,
          fieldKey: resolveCanonicalWildcardKey(fieldKey),
          confidence: Number.isFinite(confidence) ? Math.min(Math.max(confidence, 0), 1) : 0,
          reason,
        } satisfies SlotSuggestion;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      slots: fillMissingSlots(normalized, input.slotCount),
      suggestedTemplateName: sanitizeSuggestedModelName(parsed?.modelName, input.textWithSlots),
    };
  }
}

function fillMissingSlots(input: SlotSuggestion[], slotCount: number): SlotSuggestion[] {
  const bySlot = new Map<number, SlotSuggestion>();
  for (const item of input) {
    if (item.slot <= slotCount && !bySlot.has(item.slot)) {
      bySlot.set(item.slot, item);
    }
  }

  const result: SlotSuggestion[] = [];
  for (let slot = 1; slot <= slotCount; slot += 1) {
    const existing = bySlot.get(slot);
    if (existing) {
      result.push(existing);
    } else {
      result.push({
        slot,
        fieldKey: `CAMPO_${slot}`,
        confidence: 0,
        reason: "Sem sugestão confiável",
      });
    }
  }
  return result;
}

function parseJsonPayload(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }

  return null;
}

function sanitizeSuggestedModelName(candidate: unknown, textWithSlots: string): string {
  const fromModel = typeof candidate === "string" ? normalizeSuggestedModelName(candidate) : "";
  if (fromModel) {
    return fromModel.slice(0, 255);
  }

  const fallbackLine = textWithSlots
    .split(/\r?\n/)
    .map((line) => line.replace(/\[SLOT_\d+\]/g, "").replace(/[_#]+/g, "").trim())
    .find((line) => line.length >= 8);

  if (fallbackLine) {
    return fallbackLine.slice(0, 255);
  }

  return "Modelo de Documento";
}

function normalizeSuggestedModelName(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\p{L}\d])([A-Z\p{Lu}])/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function getTemplateSuggestionProvider(): TemplateSuggestionProvider {
  const provider = (process.env.AI_TEMPLATE_PROVIDER || "gemini").toLowerCase() as ProviderName;

  if (provider === "mock") {
    return new MockSuggestionProvider();
  }

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY não configurada.");
    }
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    return new GroqSuggestionProvider(apiKey, model);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  return new GeminiSuggestionProvider(apiKey, model);
}
