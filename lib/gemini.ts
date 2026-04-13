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

/**
 * Tries to extract a JSON array from text that may contain prose, citations,
 * or markdown fences alongside the JSON.
 */
function extractJSONArray(raw: string): unknown[] | null {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Direct parse
  try {
    const result = JSON.parse(cleaned);
    if (Array.isArray(result)) return result;
  } catch {}

  // Find the first [...] block in the text (handles prose around JSON)
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const result = JSON.parse(match[0]);
      if (Array.isArray(result)) return result;
    } catch {}
  }

  return null;
}

/**
 * Calls Gemini with Google Search grounding enabled and parses the response
 * as a JSON array. Used for web-search-powered job scraping.
 *
 * @param prompt       Full prompt instructing Gemini to search and return JSON
 * @param logLabel     If provided, logs the raw response (first 800 chars) for debugging
 */
export async function generateJSONWithSearch<T = unknown>(
  prompt: string,
  logLabel?: string
): Promise<T[]> {
  // Enable Google Search grounding for Gemini 2.x models
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const model = genAI.getGenerativeModel({
    model: PRIMARY_MODEL,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ googleSearch: {} } as any],
  });

  const result = await model.generateContent(prompt);
  const raw = result.response.text();

  if (logLabel) {
    console.log(
      `[Gemini:search] ${logLabel} — raw response (first 800 chars):\n${raw.slice(0, 800)}`
    );
  }

  const parsed = extractJSONArray(raw);
  if (parsed === null) {
    if (logLabel) {
      console.error(`[Gemini:search] ${logLabel} — could not parse JSON array from response`);
    }
    return [];
  }

  return parsed as T[];
}
