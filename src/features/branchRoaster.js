import simpleGit from "simple-git";
import { callGemini } from "../roast/geminiClient.js";

const SHAME_PATTERNS = [
  { pattern: /final/i, crime: "the word 'final' (it was never final)" },
  { pattern: /final[-_]?final/i, crime: "'final-final' (a cry for help)" },
  { pattern: /fix[-_]?fix/i, crime: "fixing the fix" },
  { pattern: /test\d*/i, crime: "a 'test' branch that shipped" },
  { pattern: /temp/i, crime: "a 'temp' branch that outlived temp" },
  { pattern: /wip/i, crime: "WIP that was never un-WIPped" },
  { pattern: /my[-_]/i, crime: "'my-' prefix (whose else would it be?)" },
  { pattern: /\d{6,}/i, crime: "a branch named after a timestamp or ticket you clearly forgot" },
  { pattern: /copy/i, crime: "a copy of a branch (the horror)" },
  { pattern: /asdf|qwerty|zzz/i, crime: "keyboard smashing as a branch name" },
  { pattern: /please[-_]?work/i, crime: "a branch named out of desperation" },
  { pattern: /[-_]{2,}/i, crime: "double dashes (why)" },
  { pattern: /new[-_]new/i, crime: "'new-new' — the sequel no one asked for" },
];

/**
 * Fetches all branches and scores them for shame.
 */
export async function analyzeBranches(repoPath = ".") {
  const git = simpleGit(repoPath);
  const branchSummary = await git.branch(["-a"]);

  const branches = Object.keys(branchSummary.branches)
    .map((name) => name.replace(/^remotes\/origin\//, "").trim())
    .filter((name, idx, arr) => arr.indexOf(name) === idx)
    .filter((name) => name !== "HEAD");

  const analyzed = branches.map((name) => {
    const crimes = SHAME_PATTERNS.filter(({ pattern }) => pattern.test(name)).map(
      ({ crime }) => crime
    );

    const shameScore =
      crimes.length + (name.length > 60 ? 2 : 0) + (name.split(/[-_]/).length > 6 ? 1 : 0);

    return {
      name,
      crimes,
      shameScore,
      isLong: name.length > 60,
      wordCount: name.split(/[-_]/).length,
    };
  });

  analyzed.sort((a, b) => b.shameScore - a.shameScore);

  return {
    total: branches.length,
    shamed: analyzed.filter((b) => b.shameScore > 0),
    all: analyzed,
    longestBranch: [...analyzed].sort((a, b) => b.name.length - a.name.length)[0],
    mostCriminal: analyzed[0],
  };
}

/** Generate a savage AI roast of the branch names */
export async function roastBranches(branchData) {
  const { shamed, longestBranch, mostCriminal, total } = branchData;

  if (total === 0) return null;

  const examples =
    shamed
      .slice(0, 8)
      .map(
        (b) =>
          `"${b.name}" — crimes: ${
            b.crimes.length ? b.crimes.join(", ") : "general chaos"
          }`
      )
      .join("\n");

  const prompt = `You are a savage code reviewer who finds branch names physically painful to read.\nRoast these branch names from someone's git repo. Be brutal, specific, and funny. Full savage mode.\n\nBRANCH CRIME SCENE:\n${examples ||
    shamed
      .slice(0, 5)
      .map((b) => `"${b.name}"`)
      .join("\n")}
Longest branch name: "${longestBranch?.name}" (${longestBranch?.name.length} chars)\nMost criminal: "${mostCriminal?.name}"\nTotal branches: ${total}, Shameful ones: ${shamed.length}\n\nFormat:\nOPENER: <devastating one-liner about their branch naming philosophy>\nROAST: <3-4 sentences, reference specific branches by name>\nWORST: <single out the absolute worst branch and explain why it's a crime against git>\nSENTENCE: <their punishment>`;

  const text = await callGemini({ prompt, maxOutputTokens: 700 });

  const extract = (key) =>
    text.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    opener: extract("OPENER"),
    roast: extract("ROAST"),
    worst: extract("WORST"),
    sentence: extract("SENTENCE"),
    data: branchData,
  };
}
