import "server-only";

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters?: {
    type: "OBJECT";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GeminiResult {
  text: string;
  functionCalls: { name: string; args: Record<string, unknown> }[];
  finishReason?: string;
}

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const base = (process.env.GEMINI_API_BASE?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  return { apiKey: apiKey || null, model, base, configured: Boolean(apiKey) };
}

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

/**
 * Auth failures are remembered briefly. A rejected key should not add a
 * provider round-trip to every learner message; the advisor falls back
 * immediately until the circuit expires, then retries once.
 */
const CIRCUIT_MS = 10 * 60 * 1000;
let circuit: { until: number; message: string } | null = null;

export function geminiCircuitState() {
  if (!circuit || circuit.until <= Date.now()) return { open: false, until: null };
  return { open: true, until: new Date(circuit.until).toISOString(), message: circuit.message };
}

function openCircuit(message: string) {
  circuit = { until: Date.now() + CIRCUIT_MS, message: message.slice(0, 300) };
}

export async function generateContent(options: {
  system: string;
  contents: GeminiContent[];
  tools?: FunctionDeclaration[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiResult> {
  const { apiKey, model, base } = geminiConfig();
  if (!apiKey) throw new GeminiError("Gemini is not configured", 503);

  if (circuit && circuit.until > Date.now()) {
    throw new GeminiError(
      `Gemini temporarily disabled after a rejected credential: ${circuit.message}`,
      503
    );
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: options.system }] },
    contents: options.contents,
    generationConfig: {
      temperature: options.temperature ?? 0.35,
      topP: 0.9,
      maxOutputTokens: options.maxOutputTokens ?? 1400,
    },
  };
  if (options.tools?.length) {
    body.tools = [{ functionDeclarations: options.tools }];
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } };
  }

  let response: Response;
  try {
    response = await fetch(`${base}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
  } catch (error) {
    throw new GeminiError(
      `Gemini request failed: ${(error as Error).message}`,
      504
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) {
      openCircuit(detail || `HTTP ${response.status}`);
    }
    throw new GeminiError(
      `Gemini returned ${response.status}: ${detail.slice(0, 300)}`,
      response.status === 429 ? 429 : 502
    );
  }

  const data = (await response.json()) as {
    candidates?: {
      content?: { parts?: GeminiPart[] };
      finishReason?: string;
    }[];
    promptFeedback?: { blockReason?: string };
  };

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new GeminiError(
      data.promptFeedback?.blockReason
        ? `The model declined this request (${data.promptFeedback.blockReason}).`
        : "The model returned no content.",
      422
    );
  }

  circuit = null;

  const parts = candidate.content?.parts ?? [];
  const text = parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  const functionCalls = parts
    .filter((part) => part.functionCall)
    .map((part) => ({
      name: part.functionCall!.name,
      args: part.functionCall!.args ?? {},
    }));

  return { text, functionCalls, finishReason: candidate.finishReason };
}
