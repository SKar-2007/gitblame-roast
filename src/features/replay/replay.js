import simpleGit from "simple-git";
import chalk from "chalk";

const LAZY_PATTERNS = [
  /^fix$/i,
  /^wip$/i,
  /^update$/i,
  /^asdf/i,
  /^ok$/i,
  /^done$/i,
  /^stuff$/i,
  /^changes$/i,
  /^commit$/i,
];

const SHAME_HOURS = new Set([0, 1, 2, 3, 4, 22, 23]);

export async function buildReplay(repoPath = ".", weeks = 24) {
  const git = simpleGit(repoPath);
  const raw = await git.raw(["log", "--format=%H|%an|%ad|%s", "--date=iso"]);

  const commits = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msg] = line.split("|");
      const d = new Date(date?.trim());
      return {
        hash: hash?.trim(),
        author: author?.trim(),
        date: d,
        week: getWeekKey(d),
        message: msg.join("|").trim(),
        isLazy: LAZY_PATTERNS.some((p) => p.test(msg.join("|").trim())),
        isLateNight: SHAME_HOURS.has(d.getHours()),
      };
    });

  const byWeek = {};
  for (const c of commits) {
    if (!byWeek[c.week]) byWeek[c.week] = [];
    byWeek[c.week].push(c);
  }

  const weekKeys = Object.keys(byWeek).sort().slice(-weeks);

  const timeline = weekKeys.map((week) => {
    const wc = byWeek[week];
    const lazyRatio = wc.filter((c) => c.isLazy).length / wc.length;
    const lateRatio = wc.filter((c) => c.isLateNight).length / wc.length;

    const score = Math.min(
      100,
      Math.round(lazyRatio * 50 + lateRatio * 30 + Math.min(20, wc.length / 5))
    );

    return { week, commits: wc.length, lazyRatio, lateRatio, score };
  });

  return timeline;
}

export async function renderReplay(timeline) {
  if (!timeline.length) {
    console.log(chalk.yellow("\n  No timeline data found.\n"));
    return;
  }

  console.log(chalk.bold("\n🎬 ROAST REPLAY — Your Shame Over Time\n"));
  console.log(chalk.dim("  Week-by-week roast score (higher = more crimes)\n"));

  for (const entry of timeline) {
    const { week, score, commits } = entry;
    const barWidth = Math.round((score / 100) * 35);
    const bar = "█".repeat(barWidth) + "░".repeat(35 - barWidth);
    const barColor = score >= 70 ? chalk.red : score >= 40 ? chalk.yellow : chalk.green;
    const marker = score >= 80 ? " 💀" : score >= 60 ? " 🔥" : score >= 40 ? " 🌶️" : "";

    console.log(
      `  ${chalk.dim(week)}  ${barColor(bar)}  ${chalk.bold(String(score).padStart(3))}/100` +
        `  ${chalk.dim(String(commits).padStart(3) + " commits")}${marker}`
    );
  }

  const recent = timeline.slice(-4).reduce((a, b) => a + b.score, 0) / 4;
  const older = timeline.slice(0, 4).reduce((a, b) => a + b.score, 0) / 4;
  const trend = recent - older;
  const peakWeek = timeline.reduce((a, b) => (a.score > b.score ? a : b));
  const bestWeek = timeline.reduce((a, b) => (a.score < b.score ? a : b));

  console.log(chalk.bold("\n  📈 Trend Analysis\n"));
  console.log(
    `  ${chalk.dim("Peak shame week:")} ${chalk.red.bold(peakWeek.week)} (score: ${peakWeek.score})`
  );
  console.log(
    `  ${chalk.dim("Cleanest week:")} ${chalk.green.bold(bestWeek.week)} (score: ${bestWeek.score})`
  );
  console.log(
    `  ${chalk.dim("Recent trend:")} ${
      trend > 5
        ? chalk.red("📈 Getting WORSE +" + trend.toFixed(0))
        : trend < -5
        ? chalk.green("📉 Improving " + trend.toFixed(0))
        : chalk.yellow("→ Consistently mediocre")
    }`
  );
  console.log();
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
