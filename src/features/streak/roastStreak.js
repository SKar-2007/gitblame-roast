import fs from "fs";
import path from "path";
import { callGemini } from "../../roast/geminiClient.js";

const LAZY_PATTERNS = [
  /^fix$/i,
  /^fixed$/i,
  /^wip$/i,
  /^update$/i,
  /^asdf/i,
  /^test$/i,
  /^temp$/i,
  /^ok$/i,
  /^done$/i,
  /^stuff$/i,
  /^changes$/i,
  /^commit$/i,
  /^\./i,
  /^misc$/i,
  /^lol$/i,
];

export async function analyzeStreak(repoPath = ".", limit = 300) {
  const { default: simpleGit } = await import("simple-git");
  const git = simpleGit(repoPath);
  const raw = await git.raw(["log", `--max-count=${limit}`, "--format=%H|%an|%ad|%s", "--date=short"]);

  const commits = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msg] = line.split("|");
      const message = msg.join("|").trim();
      return {
        hash: hash?.trim(),
        author: author?.trim(),
        date: date?.trim(),
        message,
        isLazy: LAZY_PATTERNS.some((p) => p.test(message)),
      };
    });

  const byDay = {};
  for (const c of commits) {
    if (!byDay[c.date]) byDay[c.date] = [];
    byDay[c.date].push(c);
  }

  const days = Object.keys(byDay).sort().reverse();
  const dayScores = days.map((date) => {
    const dc = byDay[date];
    const lazyRatio = dc.filter((c) => c.isLazy).length / dc.length;
    return { date, commits: dc.length, lazyRatio, isShameDay: lazyRatio >= 0.5 };
  });

  let currentStreak = 0;
  for (const d of dayScores) {
    if (d.isShameDay) currentStreak++;
    else break;
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let longestStart = "";
  let longestEnd = "";
  for (let i = dayScores.length - 1; i >= 0; i--) {
    if (dayScores[i].isShameDay) {
      if (tempStreak === 0) longestEnd = dayScores[i].date;
      tempStreak++;
      longestStart = dayScores[i].date;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  const historyPath = path.resolve(repoPath, ".roast-streak.json");
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(historyPath, "utf-8"));
  } catch {
    // ignore
  }
  history.push({ date: new Date().toISOString(), currentStreak });
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history.slice(-90), null, 2));
  } catch {
    // ignore
  }

  return { currentStreak, longestStreak, longestStart, longestEnd, dayScores: dayScores.slice(0, 30) };
}

export async function roastStreak(data) {
  const { currentStreak, longestStreak, longestStart, longestEnd } = data;
  if (currentStreak === 0 && longestStreak === 0) return null;

  const prompt = `You are a savage sports commentator narrating a developer's unbroken losing streak.\nCurrent shame streak: ${currentStreak} consecutive days of lazy commits.\nLongest ever streak: ${longestStreak} days (${longestStart} to ${longestEnd}).\nBe brutal, specific, and funny. Full savage mode.\n\nFormat:\nOPENER: <one punchy line>\nROAST: <2-3 sentences, treat it like a sports losing streak>\nADVICE: <one savage piece of advice>`;

  const text = await callGemini({ prompt, maxOutputTokens: 500 });
  const ex = (k) =>
    text.match(new RegExp(`${k}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return { opener: ex("OPENER"), roast: ex("ROAST"), advice: ex("ADVICE"), data };
}
