/**
 * Standalone Gemini key + model check using the official @google/genai SDK.
 *
 *   npm run gemini:check
 *
 * Reads GEMINI_API_KEY and GEMINI_MODEL from .env.local (or the shell).
 * Exits non-zero with the provider's error when the key is rejected.
 */
import { GoogleGenAI } from "@google/genai";
import { loadLocalEnv } from "./env";

async function main() {
  loadLocalEnv();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in .env.local (or the shell).");
    process.exit(1);
  }

  console.log(`Testing ${model} with the official @google/genai SDK…`);
  const ai = new GoogleGenAI({ apiKey });
  const started = Date.now();

  try {
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with the single word OK.",
      config: { temperature: 0, maxOutputTokens: 16 },
    });
    console.log(`OK in ${Date.now() - started}ms: ${response.text?.trim() || "(empty response)"}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILED in ${Date.now() - started}ms: ${message}`);
    if (message.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
      console.error(
        "\nGoogle rejected the credential type. This usually means the value is an ephemeral/Live API token, is truncated, or is restricted to another API. Create a standard key at https://aistudio.google.com/apikey and copy it in full."
      );
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
