import fs from "fs";
import path from "path";

/**
 * Computes a roast score (0–100) from repo stats and generates:
 *  1. A shields.io badge URL  (embed in README)
 *  2. A local SVG badge file  (self-hosted fallback)
 */
export function generateBadge(stats, options = {}) {
  const { outputDir = "./output", repoName = "your-repo" } = options;
  const score = computeRoastScore(stats);
  const { label, color, emoji } = getRoastLevel(score);

  const badgeLabel = encodeURIComponent("roast score");
  const badgeMessage = encodeURIComponent(`${score}/100 ${emoji}`);
  const shieldsUrl = `https://img.shields.io/badge/${badgeLabel}-${badgeMessage}-${color}?style=for-the-badge&logo=git&logoColor=white`;

  const repoUrl = `https://github.com/yourusername/${repoName}`;
  const badgeMd = `[![Roast Score](${shieldsUrl})](${repoUrl})`;
  const badgeHtml = `<img src="${shieldsUrl}" alt="Roast Score ${score}/100"/>`;

  fs.mkdirSync(outputDir, { recursive: true });
  const svgPath = path.join(outputDir, "roast-badge.svg");
  fs.writeFileSync(svgPath, buildSvgBadge(score, label, emoji, color), "utf-8");

  updateScoreHistory(score, outputDir);

  return { score, label, emoji, shieldsUrl, badgeMd, badgeHtml, svgPath };
}

/** Compute 0–100 roast score from git stats */
function computeRoastScore(stats) {
  const s = stats.stats;
  let score = 0;

  const total = s.totalCommits || 1;

  score += Math.min(25, Math.round((s.lateNightCommits / total) * 100));
  score += Math.min(25, Math.round(((s.lazyMessages?.length ?? 0) / total) * 100));
  const bigDumps = Object.values(s.authorStats ?? {}).reduce(
    (a, b) => a + (b.bigDumps ?? 0),
    0
  );
  score += Math.min(25, bigDumps * 5);
  score += Math.min(15, Math.round((s.weekendCommits / total) * 60));
  score += Math.min(10, Math.floor(total / 50));

  return Math.min(100, score);
}

function getRoastLevel(score) {
  if (score >= 80) return { label: "BURNT TO ASH", color: "8B0000", emoji: "💀" };
  if (score >= 60) return { label: "EXTRA CRISPY", color: "DC2626", emoji: "🔥" };
  if (score >= 40) return { label: "WELL DONE", color: "EA580C", emoji: "🌶️" };
  if (score >= 20) return { label: "MEDIUM RARE", color: "D97706", emoji: "🥩" };
  return { label: "SUSPICIOUSLY CLEAN", color: "16A34A", emoji: "🌸" };
}

function buildSvgBadge(score, label, emoji, hexColor) {
  const fullLabel = `${emoji} ROAST SCORE`;
  const value = `${score}/100 · ${label}`;
  const lw = fullLabel.length * 7 + 20;
  const vw = value.length * 7 + 20;
  const tw = lw + vw;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="28">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${tw}" height="28" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="28" fill="#1f2937"/>
    <rect x="${lw}" width="${vw}" height="28" fill="#${hexColor}"/>
    <rect width="${tw}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">
    <text x="${lw / 2}" y="18" text-anchor="middle" fill="#fff">${fullLabel}</text>
    <text x="${lw + vw / 2}" y="18" text-anchor="middle" fill="#fff">${value}</text>
  </g>
</svg>`;
}

function updateScoreHistory(score, outputDir) {
  const histFile = path.join(outputDir, ".roast-history.json");
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(histFile, "utf-8"));
  } catch {
    // ignore
  }
  history.push({ score, date: new Date().toISOString() });
  fs.writeFileSync(histFile, JSON.stringify(history.slice(-30), null, 2));
}

/** Render badge info to terminal */
export async function renderBadge(badgeData) {
  const chalk = (await import("chalk")).default;
  const { score, label, emoji, badgeMd, svgPath } = badgeData;

  console.log(chalk.bold("\n🏅 README ROAST BADGE\n"));
  console.log(`  ${chalk.dim("Score:")}  ${chalk.bold.yellow(score + "/100")}  ${emoji}  ${chalk.italic(label)}\n`);
  console.log(chalk.dim("  Paste this into your README.md:\n"));
  console.log(chalk.cyan("  " + badgeMd));
  console.log(chalk.dim(`\n  Self-hosted SVG: ${svgPath}\n`));
}
