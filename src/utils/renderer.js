import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import { generateShareCard } from "./shareCard.js";

const ROAST_LEVELS = {
  low:    { label: "🟡 MEDIUM RARE",  color: chalk.yellow },
  medium: { label: "🟠 WELL DONE",    color: chalk.hex("#FF8C00") },
  high:   { label: "🔴 EXTRA CRISPY", color: chalk.red },
  savage: { label: "💀 BURNT TO ASH", color: chalk.bgRed.white.bold },
};

/**
 * Renders the full roast output to the terminal.
 */
export async function renderRoast(roastData, stats, options = {}) {
  const { savage, compliment } = options;
  const s = stats.stats;

  // ─── Stats summary ───────────────────────────────────────────────
  console.log(chalk.bold("\n📊 Repo Autopsy Report"));
  console.log(chalk.dim("─".repeat(45)));

  printStat("Total commits analyzed", s.totalCommits);
  printStat("Late-night commits (11pm–4am)", s.lateNightCommits, s.lateNightCommits > 10);
  printStat("Weekend commits", s.weekendCommits, s.weekendCommits > 5);
  printStat("Meaningless commit messages", s.lazyMessages.length, s.lazyMessages.length > 5);

  if (s.biggestCommit) {
    const bc = s.biggestCommit;
    printStat(
      "Biggest single commit",
      `${bc.filesChanged} files — "${bc.message}"`,
      bc.filesChanged > 20
    );
  }

  if (s.repeatedMessages.length > 0) {
    console.log(chalk.dim("\n  Most repeated messages:"));
    s.repeatedMessages.forEach(([msg, count]) => {
      console.log(chalk.red(`    "${msg}"`), chalk.dim(`×${count}`));
    });
  }

  // ─── The Roast ────────────────────────────────────────────────────
  console.log("\n");
  console.log(
    boxen(
      [
        gradient.passion("🔥 THE ROAST 🔥"),
        "",
        chalk.bold.white(roastData.opening),
        "",
        chalk.white(roastData.roast),
        "",
        chalk.dim("━".repeat(40)),
        chalk.yellow("💀 Worst Commit Award:"),
        chalk.italic(roastData.worstCommit),
        "",
        chalk.dim("━".repeat(40)),
        chalk.cyan("🏆 Your Developer Title:"),
        chalk.bold.green(`"${roastData.title}"`),
        "",
        chalk.dim(roastData.closing),
      ].join("\n"),
      {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: savage ? "red" : compliment ? "green" : "yellow",
      }
    )
  );

  // ─── Roast level ─────────────────────────────────────────────────
  const level = getRoastLevel(s, savage);
  const levelInfo = ROAST_LEVELS[level];
  console.log(
    chalk.bold("  Roast Level: ") + levelInfo.color(levelInfo.label)
  );

  if (!savage) {
    console.log(
      chalk.dim(
        "\n  Run with --savage for absolutely no mercy. You've been warned.\n"
      )
    );
  }

  // ─── Share prompt ─────────────────────────────────────────────────
  console.log(
    chalk.dim(
      "  💡 Tip: Share your roast on Twitter and tag your team with --author\n"
    )
  );

  if (options.share) {
    const output = typeof options.share === "string" ? options.share : "roast.png";
    try {
      const file = await generateShareCard(roastData, stats, {
        savage,
        compliment,
        output,
      });
      console.log(chalk.green(`\n  ✅ Share card saved to: ${file}\n`));
    } catch (err) {
      console.error(chalk.red("\n  ✗ Failed to generate shareable card."));
      console.error(chalk.dim(`  ${err.message}\n`));
    }
  }
}

/** Prints a labeled stat with optional red highlight */
function printStat(label, value, warn = false) {
  const valueStr = warn ? chalk.red.bold(String(value)) : chalk.white(String(value));
  console.log(`  ${chalk.dim(label + ":")} ${valueStr}`);
}

/** Determine roast intensity level from stats */
function getRoastLevel(s, savage) {
  if (savage) return "savage";
  const score =
    (s.lateNightCommits > 15 ? 1 : 0) +
    (s.lazyMessages.length > 10 ? 1 : 0) +
    (s.biggestCommit?.filesChanged > 50 ? 1 : 0);
  if (score >= 2) return "high";
  if (score === 1) return "medium";
  return "low";
}
