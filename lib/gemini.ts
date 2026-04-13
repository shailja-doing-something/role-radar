import { GoogleGenerativeAI } from "@google/generative-ai";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateContent(
  prompt: string,
  useFallback = false
): Promise<string> {
  const modelName = useFallback ? FALLBACK_MODEL : PRIMARY_MODEL;
  const model = genAI.getGenerativeModel({ model: modelName });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      attempts++;
      const msg = error instanceof Error ? error.message : String(error);

      console.log(`[Gemini] ${modelName} attempt ${attempts} failed: ${msg}`);

      const is503 = msg.includes("503");
      const is404 = msg.includes("404");

      if (is404 || is503) {
        if (!useFallback) {
          console.log("[Gemini] Switching to fallback model immediately");
          return generateContent(prompt, true);
        }
        throw new Error(`Both models failed. Last error: ${msg}`);
      }

      if (attempts >= maxAttempts) {
        if (!useFallback) {
          console.log("[Gemini] Switching to fallback model...");
          return generateContent(prompt, true);
        }
        throw error;
      }

      const delay = 2000 * attempts;
      console.log(`[Gemini] Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("All Gemini models failed");
}

/**
 * Calls Gemini and parses the response as JSON.
 * Always instructs the model to return raw JSON only — no markdown, no prose.
 */
export async function generateJSON<T = unknown>(prompt: string): Promise<T> {
  const jsonPrompt = `${prompt}

Respond with raw JSON only. No markdown, no code fences, no explanation.`;

  const raw = await generateContent(jsonPrompt);

  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned) as T;
}

