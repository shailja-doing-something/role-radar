import { GoogleGenerativeAI, type Tool } from "@google/generative-ai";

const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
// Gemini 2.5 Flash for Google Search grounding (googleSearchRetrieval tool)
const SEARCH_MODEL = "gemini-2.5-flash";

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
 * Calls Gemini with Google Search grounding and parses the first JSON array
 * found in the (potentially noisy) response. Falls back to non-search on error.
 */
export async function generateJSONWithSearch<T = unknown>(prompt: string): Promise<T> {
  // gemini-2.5-flash uses google_search (not googleSearchRetrieval)
  const searchTools = [{ googleSearch: {} }] as unknown as Tool[];
  const model = genAI.getGenerativeModel({ model: SEARCH_MODEL, tools: searchTools });

  try {
    const result  = await model.generateContent(prompt);
    const raw     = result.response.text();
    const cleaned = extractFirstJsonCollection(raw);
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.warn("[Gemini] Web-search call failed, falling back to standard:", e instanceof Error ? e.message : e);
    return generateJSON<T>(prompt);
  }
}

/** Extracts the first complete JSON array or object from a (possibly noisy) string. */
function extractFirstJsonCollection(text: string): string {
  const openChars  = new Set(["{", "["]);
  const start      = [...text].findIndex(c => openChars.has(c));
  if (start === -1) return "[]";

  const open  = text[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0, inStr = false, esc = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc)          { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true;  continue; }
    if (c === '"')    { inStr = !inStr; continue; }
    if (inStr)        continue;
    if (c === open)   depth++;
    if (c === close && --depth === 0) return text.slice(start, i + 1);
  }
  return "[]";
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

