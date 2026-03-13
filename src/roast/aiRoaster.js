const PROVIDER = "gemini";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use a modern Gemini generation model by default (2026+).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5";

/**
 * Calls the configured LLM to generate a roast based on git stats.
 * @param {object} stats - the analyzed git stats
 * @param {object} options - { savage, compliment, author }
 */
export async function generateRoast(stats, options = {}) {
  return generateRoastWithGemini(stats, options);
}

async function generateRoastWithGemini(stats, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it to use Gemini."
    );
  }

  const { savage = false, compliment = false, author } = options;
  const tone = compliment
    ? "You are a warm, encouraging tech mentor. Be genuinely positive."
    : savage
    ? "You are a ruthless, savage tech comedian. ZERO mercy. Brutal honesty only."
    : "You are a witty developer comedian. Be funny but not too mean.";

  const prompt = buildPrompt(stats, author);
  const input = `${tone}\n\nHere is the git history analysis data:\n\n${prompt}\n\nGenerate a funny roast of this developer's git habits. 

  Format your response EXACTLY like this (keep the labels):
  OPENING: <one punchy opening line>
  ROAST: <the main roast, 3-5 sentences, specific to the data>
  WORST_COMMIT: <roast of their single worst commit>
  CLOSING: <a funny closing one-liner or advice>
  TITLE: <give them a funny developer title e.g. "The Midnight Cowboy" or "Lord of WIP">`;

  const url = `https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generateText?key=${encodeURIComponent(
    GEMINI_API_KEY
  )}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: { text: input },
      temperature: 0.2,
      maxOutputTokens: 1024,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(
      `Gemini API request failed (${resp.status}): ${body.slice(0, 1024)}`
    );
  }

  const data = await resp.json();
  const output = data?.candidates?.[0]?.output ?? data?.resp?.candidates?.[0]?.output;
  if (!output) {
    throw new Error("Gemini response did not include an output candidate.");
  }

  return parseRoastResponse(output);
}

/** Build the data prompt from stats */
function buildPrompt(stats, author) {
  const s = stats.stats;
  const authorData = author ? s.authorStats[author] : null;

  const lines = [
    `Total commits analyzed: ${s.totalCommits}`,
    `Late night commits (11pm–4am): ${s.lateNightCommits}`,
    `Weekend commits: ${s.weekendCommits}`,
    `Lazy/meaningless commit messages: ${s.lazyMessages.length}`,
  ];

  if (s.lazyMessages.length > 0) {
    lines.push(
      `Examples of lazy messages: ${s.lazyMessages
        .slice(0, 5)
        .map((c) => `"${c.message}"`)
        .join(", ")}`
    );
  }

  if (s.biggestCommit) {
    const bc = s.biggestCommit;
    const hour = bc.date.getHours();
    lines.push(
      `Biggest single commit: "${bc.message}" with ${bc.filesChanged} files changed, ` +
        `${bc.insertions} insertions, ${bc.deletions} deletions at ${hour}:00`
    );
  }

  if (s.repeatedMessages.length > 0) {
    lines.push(
      `Most repeated commit messages: ${s.repeatedMessages
        .map(([msg, count]) => `"${msg}" (${count}x)`)
        .join(", ")}`
    );
  }

  if (authorData) {
    lines.push(`Author-specific: ${authorData.lateNight} late-night commits, ${authorData.bigDumps} massive code dumps`);
  }

  return lines.join("\n");
}

/** Parse the structured response from Gemini */
function parseRoastResponse(text) {
  const extract = (key) => {
    const match = text.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"));
    return match ? match[1].trim() : "";
  };

  return {
    opening: extract("OPENING"),
    roast: extract("ROAST"),
    worstCommit: extract("WORST_COMMIT"),
    closing: extract("CLOSING"),
    title: extract("TITLE"),
  };
}
