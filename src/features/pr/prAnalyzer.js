import simpleGit from "simple-git";
import { callGemini } from "../../roast/geminiClient.js";

const MERGE_PATTERNS = [
  /^Merge pull request #(\d+) from (.+)/i,
  /^Merge branch '(.+)' into (.+)/i,
  /^Merged in (.+) \(pull request #(\d+)\)/i,
  /^Merge remote-tracking branch/i,
];

const EMPTY_PR_PATTERNS = [
  /^(no description|n\/a|none|-)$/i,
  /^(fixes|fix|updated?|changes?)\.?$/i,
  /^(wip|work in progress)$/i,
  /^(see title|as above)$/i,
];

const JUNK_BODY_PATTERNS = [
  /^(\.{1,3}|-)$/,
  /^(todo|tbd|tbd|fixme)$/i,
  /^\s*$/,
];

export async function analyzePRs(repoPath = ".", limit = 200) {
  const git = simpleGit(repoPath);
  const raw = await git.raw([
    "log",
    `--max-count=${limit}`,
    "--merges",
    "--format=%H|%an|%ad|%s|%b",
    "--date=short",
  ]);

  if (!raw.trim()) {
    return { prs: [], totalMerges: 0, emptyDescriptions: 0, shortDescriptions: 0 };
  }

  const entries = raw.trim().split(/\n(?=[a-f0-9]{40}\|)/);
  const prs = [];

  for (const entry of entries) {
    const lines = entry.split("\n");
    const header = lines[0];
    const [hash, author, date, ...subjectParts] = header.split("|");
    const subject = subjectParts[0]?.trim() ?? "";
    const body = lines.slice(1).join("\n").trim();

    const isMerge = MERGE_PATTERNS.some((p) => p.test(subject));
    if (!isMerge) continue;

    const prNumMatch = subject.match(/#(\d+)/);
    const prNumber = prNumMatch ? prNumMatch[1] : null;

    const isEmpty = !body || JUNK_BODY_PATTERNS.some((p) => p.test(body.trim()));
    const isShort = body.length > 0 && body.length < 30;
    const isLazy = EMPTY_PR_PATTERNS.some((p) => p.test(body.trim()));
    const wordCount = body.split(/\s+/).filter(Boolean).length;

    const grade = isEmpty
      ? "F"
      : isLazy
      ? "D"
      : isShort
      ? "C"
      : wordCount < 20
      ? "B"
      : "A";

    prs.push({
      hash: hash?.trim(),
      author: author?.trim(),
      date: date?.trim(),
      subject,
      body,
      prNumber,
      isEmpty,
      isShort,
      isLazy,
      wordCount,
      grade,
    });
  }

  const emptyDescriptions = prs.filter((p) => p.isEmpty || p.isLazy).length;
  const shortDescriptions = prs.filter((p) => p.isShort).length;
  const gradeF = prs.filter((p) => p.grade === "F").length;
  const gradeA = prs.filter((p) => p.grade === "A").length;

  const authorGrades = {};
  for (const pr of prs) {
    if (!authorGrades[pr.author]) authorGrades[pr.author] = { F: 0, D: 0, C: 0, B: 0, A: 0 };
    authorGrades[pr.author][pr.grade]++;
  }

  return {
    prs,
    totalMerges: prs.length,
    emptyDescriptions,
    shortDescriptions,
    gradeF,
    gradeA,
    authorGrades,
  };
}

export async function roastPRs(data) {
  if (data.totalMerges === 0) return null;

  const worstPRs = data.prs
    .filter((p) => p.grade === "F" || p.grade === "D")
    .slice(0, 5)
    .map(
      (p) =>
        `PR#${p.prNumber ?? "?"} by ${p.author}: subject="${p.subject}" body="${
          p.body || "(empty)"
        }"`
    )
    .join("\n");

  const topShame = Object.entries(data.authorGrades)
    .map(([, g]) => `F:${g.F} D:${g.D} A:${g.A}`)
    .slice(0, 4)
    .join("\n");

  const prompt = `You are a savage code reviewer who has seen too many empty PR descriptions.\nEvery empty PR description is an act of disrespect toward future developers.\nRoast these PRs brutally. Full savage mode.\n\nSTATS:\nTotal merge commits analyzed: ${data.totalMerges}\nEmpty/useless descriptions: ${data.emptyDescriptions}\nGrade F PRs: ${data.gradeF}\nGrade A PRs: ${data.gradeA}\n\nWorst offenders:\n${worstPRs || "All PRs are empty. Spectacular."}\n\nAuthor shame:\n${topShame || "Unknown"}\n\nFormat:\nHEADLINE: <devastating opener>\nROAST: <3-4 sentences, reference specific PRs/authors>\nWORST: <roast the single worst PR specifically>\nLESSON: <one brutal lesson they need to learn>`;

  const text = await callGemini({ prompt, maxOutputTokens: 700 });
  const ex = (k) =>
    text.match(new RegExp(`${k}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    headline: ex("HEADLINE"),
    roast: ex("ROAST"),
    worst: ex("WORST"),
    lesson: ex("LESSON"),
    data,
  };
}
