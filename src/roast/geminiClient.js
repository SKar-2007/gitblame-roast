const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5";

if (!GEMINI_API_KEY) {
  // We don't throw here so that importing modules doesn't crash at import-time; errors are thrown when called.
}

export async function callGemini({ prompt, maxOutputTokens = 900, temperature = 0.2 }) {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY. Set it to use Gemini.");
  }

  const url = `https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generateText?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: { text: prompt },
      temperature,
      maxOutputTokens,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini API request failed (${resp.status}): ${body.slice(0, 1024)}`);
  }

  const data = await resp.json();
  const output = data?.candidates?.[0]?.output ?? data?.resp?.candidates?.[0]?.output;
  if (!output) {
    throw new Error("Gemini response did not include an output candidate.");
  }

  return output;
}
