import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import { analyzeRepo } from "../../analyzers/gitAnalyzer.js";
import { buildHeatmap } from "../heatmap/commitHeatmap.js";
import { analyzeStreak } from "../streak/roastStreak.js";
import { analyzeTodoGraveyard } from "../todoGraveyard.js";
import { analyzeBranches } from "../branchRoaster.js";
import { analyzePersonality } from "../personality/personality.js";
import { generateRoast } from "../../roast/aiRoaster.js";
import { generateBadge } from "../badge/roastBadge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Orchestrates all analyzers → bundles data → calls Python reportlab generator.
 */
export async function generatePDFReport(options = {}) {
  const {
    repoPath = ".",
    author,
    outputDir = "./output",
    limit = 300,
    savage = true,
  } = options;

  fs.mkdirSync(outputDir, { recursive: true });

  // ── 1. Run all analyzers in parallel ──────────────────────────
  const [stats, heatmap, streak, todos, branchData] = await Promise.all([
    analyzeRepo(repoPath, { author, limit }),
    buildHeatmap(repoPath, limit),
    analyzeStreak(repoPath, limit),
    analyzeTodoGraveyard(repoPath).catch(() => []),
    analyzeBranches(repoPath).catch(() => ({ shamed: [] })),
  ]);

  // ── 2. AI roast ────────────────────────────────────────────────
  const roastData = await generateRoast(stats, { savage, author });

  // ── 3. Personality ─────────────────────────────────────────────
  const personality = await analyzePersonality(stats, author).catch(() => ({}));

  // ── 4. Badge score ─────────────────────────────────────────────
  const badge = generateBadge(stats, { outputDir });

  // ── 5. Build author leaderboard ────────────────────────────────
  const s = stats.stats;
  const topAuthors = Object.entries(s.authorStats ?? {})
    .map(([author, d]) => ({
      author,
      commits:   d.commits    ?? 0,
      lateNight: d.lateNight  ?? 0,
      lazy:      d.lazy       ?? 0,
      bigDumps:  d.bigDumps   ?? 0,
      score: Math.min(100,
        (d.lateNight ?? 0) * 3 + (d.lazy ?? 0) * 2 + (d.bigDumps ?? 0) * 5
      ),
    }))
    .sort((a, b) => b.score - a.score);

  // ── 6. Bundle JSON for Python ──────────────────────────────────
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const payload = {
    month,
    repoName:   path.basename(path.resolve(repoPath)),
    author:     author || "All Authors",
    score:      badge.score,
    stats: {
      totalCommits:     s.totalCommits,
      lateNightCommits: s.lateNightCommits,
      weekendCommits:   s.weekendCommits,
      lazyMessages:     s.lazyMessages?.length ?? 0,
      biggestCommit:    s.biggestCommit,
      repeatedMessages: s.repeatedMessages ?? [],
    },
    roast: {
      opening:     roastData.opening,
      roast:       roastData.roast,
      worstCommit: roastData.worstCommit,
      closing:     roastData.closing,
      title:       roastData.title,
    },
    personality: {
      type:    personality.type    ?? "",
      emoji:   personality.emoji   ?? "",
      tagline: personality.tagline ?? "",
    },
    topAuthors,
    hourGrid: heatmap.hourGrid,
    streak: {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      longestStart:  streak.longestStart,
      longestEnd:    streak.longestEnd,
    },
    todos: (todos || []).slice(0, 15).map(t => ({
      file:     t.file,
      line:     t.line,
      message:  t.message,
      ageLabel: t.ageLabel,
    })),
    branches: (branchData.shamed || []).slice(0, 10).map(b => ({
      name:   b.name,
      crimes: b.crimes,
    })),
  };

  // ── 7. Write JSON temp file → call Python ─────────────────────
  const tmpJson = path.join(outputDir, "_report_data.json");
  fs.writeFileSync(tmpJson, JSON.stringify(payload, null, 2));

  const dateStr = new Date().toISOString().slice(0, 10);
  const safeRepo = path.basename(path.resolve(repoPath)).replace(/[^a-z0-9]/gi, "-");
  const pdfPath = path.join(outputDir, `roast-report-${safeRepo}-${dateStr}.pdf`);
  const pyScript = path.join(__dirname, "generateReport.py");

  try {
    execSync(`python3 "${pyScript}" "${tmpJson}" "${pdfPath}"`, { stdio: "inherit" });
  } catch (err) {
    throw new Error(`PDF generation failed: ${err.message}\nMake sure Python 3 + reportlab are installed:\n  pip3 install reportlab`);
  }

  // Cleanup temp
  try { fs.unlinkSync(tmpJson); } catch {}

  return { pdfPath, payload };
}
