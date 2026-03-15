import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { analyzeReverts, roastReverts } from "../features/revert/revertShame.js";

// Load .env if present
dotenv.config();

export async function runRevertShame(options) {
  const { repo, savage, limit } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const spinner = ora("Scanning for public confessions of failure...").start();
  let data;
  try {
    data = await analyzeReverts(repo, parseInt(limit));
    spinner.succeed(
      chalk.green(
        `Found ${data.reverts.length} reverts, ${data.panics.length} panic commits across ${data.totalCommits} total.`
      )
    );
  } catch (err) {
    spinner.fail(chalk.red("Analysis failed: " + err.message));
    process.exit(1);
  }

  if (data.reverts.length === 0 && data.panics.length === 0) {
    console.log(
      chalk.green(
        "\n  ✓ No reverts or panic commits found. Either you're perfect or hiding things.\n"
      )
    );
    return;
  }

  console.log(chalk.bold(`\n🔁 REVERT HALL OF SHAME  (rate: ${data.revertRate}%)\n`));
  data.reverts.slice(0, 8).forEach((r, i) => {
    console.log(`  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.red(`\"${r.commit.message}\"`)}`);
    if (r.original)
      console.log(chalk.dim(`        ↳ reversed: "${r.original.message}"`));
  });

  if (data.revertChains.length > 0) {
    console.log(
      chalk.bold.red(
        `\n  💀 Revert-of-a-revert chains detected: ${data.revertChains.length}`
      )
    );
    console.log(chalk.dim("  (You reverted your own revert. Think about that.)\n"));
  }

  if (data.panics.length > 0) {
    console.log(chalk.bold(`\n🚨 PANIC COMMITS (${data.panics.length})\n`));
    data.panics.slice(0, 5).forEach((c, i) => {
      console.log(
        `  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.yellow(`\"${c.message}\"`)}  ${chalk.dim(c.author)}`
      );
    });
  }

  const roastSpinner = ora("Composing the autopsy report...").start();
  let roast;
  try {
    roast = await roastReverts(data);
    roastSpinner.succeed("Report ready.");
  } catch (err) {
    roastSpinner.fail("Roast failed: " + err.message);
    return;
  }

  if (roast) {
    console.log(
      "\n" +
        boxen(
          [
            chalk.bold.red("🔁 REVERT SHAME REPORT"),
            "",
            chalk.bold.white(roast.headline),
            "",
            chalk.white(roast.roast),
            "",
            chalk.dim("─".repeat(44)),
            chalk.yellow("Chain Roast: ") + chalk.italic(roast.chainRoast),
            "",
            chalk.dim("Verdict: ") + chalk.italic.dim(roast.verdict),
          ].join("\n"),
          {
            padding: 1,
            margin: 1,
            borderStyle: "double",
            borderColor: savage ? "red" : "yellow",
          }
        )
    );
  }
}
