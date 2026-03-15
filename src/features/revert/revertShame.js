import simpleGit from "simple-git";
import { callGemini } from "../../roast/geminiClient.js";

const REVERT_PATTERNS = [
  /^revert[:\s]/i,
  /^reverting/i,
  /^undo/i,
  /^rollback/i,
  /^roll back/i,
  /^this reverts commit/i,
];

const PANIC_PATTERNS = [
  /^hotfix/i,
  /^emergency/i,
  /^urgent/i,
  /^oops/i,
  /^whoops/i,
  /^my bad/i,
  /^sorry/i,
  /^broke/i,
  /^accidentally/i,
];

/**
 * Analyze commit history for reverts (+ panic commits).
 */
export async function analyzeReverts(repoPath = ".", limit = 200) {
  const git = simpleGit(repoPath);
  const rawLog = await git.raw(["log", `--max-count=${limit}`, "--format=%H|%an|%ad|%s"]);

  const commits = rawLog
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msgParts] = line.split("|");
      return {
        hash: hash?.trim(),
        author: author?.trim(),
        date: new Date(date?.trim()),
        message: msgParts.join("|").trim(),
      };
    });

  const reverts = [];
  const panics = [];

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const isRevert = REVERT_PATTERNS.some((p) => p.test(c.message));
    const isPanic = PANIC_PATTERNS.some((p) => p.test(c.message));

    if (isRevert) {
      const original = commits.slice(i + 1).find((prev) =>
        c.message.toLowerCase().includes(prev.hash?.slice(0, 7)) ||
        c.message.toLowerCase().includes(prev.message?.toLowerCase().slice(0, 20))
      );
      reverts.push({ commit: c, original: original || null });
    }
    if (isPanic) panics.push(c);
  }

  // Revert-of-a-revert chains
  const revertChains = reverts.filter((r) =>
    reverts.some(
      (r2) =>
        r2.commit.hash !== r.commit.hash &&
        r.commit.message.toLowerCase().includes(r2.commit.hash?.slice(0, 7))
    )
  );

  const authorShame = {};
  [...reverts.map((r) => r.commit), ...panics].forEach((c) => {
    if (!authorShame[c.author]) authorShame[c.author] = { reverts: 0, panics: 0 };
    if (REVERT_PATTERNS.some((p) => p.test(c.message))) authorShame[c.author].reverts++;
    else authorShame[c.author].panics++;
  });

  return {
    reverts,
    panics,
    revertChains,
    authorShame,
    totalCommits: commits.length,
    revertRate: commits.length ? ((reverts.length / commits.length) * 100).toFixed(1) : 0,
  };
}

/**
 * Generate a savage roast about reverts and panic commits.
 */
export async function roastReverts(data) {
  if (data.reverts.length === 0 && data.panics.length === 0) return null;

  const topShame = Object.entries(data.authorShame)
    .sort((a, b) => (b[1].reverts + b[1].panics) - (a[1].reverts + a[1].panics))
    .slice(0, 4)
    .map(([author, s]) => `${author}: ${s.reverts} reverts, ${s.panics} panic commits`)
    .join("\n");

  const examples = data.reverts
    .slice(0, 3)
    .map((r) =>
      `"${r.commit.message}"${r.original ? ` (reversed: "${r.original.message}")` : ""}`
    )
    .join("\n");

  const prompt = `You are a savage code historian. Every revert is a public confession of failure.\nRoast this repo's revert history brutally. Full savage mode.\n\nSTATS:\nTotal reverts: ${data.reverts.length}\nPanic commits: ${data.panics.length}\nRevert-of-a-revert chains: ${data.revertChains.length}\nRevert rate: ${data.revertRate}% of all commits\n\nExamples:\n${examples}\nAuthor shame:\n${topShame || "Unknown criminals"}\n\nFormat:\nHEADLINE: <devastating opener>\nROAST: <3-4 brutal sentences>\nCHAIN_ROAST: <roast of revert chains or worst single revert>\nVERDICT: <one line final judgment>`;

  const text = await callGemini({ prompt, maxOutputTokens: 700 });

  const extract = (key) =>
    text.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    headline: extract("HEADLINE"),
    roast: extract("ROAST"),
    chainRoast: extract("CHAIN_ROAST"),
    verdict: extract("VERDICT"),
    data,
  };
}
