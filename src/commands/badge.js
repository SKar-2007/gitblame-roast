import ora from "ora";
import chalk from "chalk";
import { analyzeRepo } from "../analyzers/gitAnalyzer.js";
import { generateBadge } from "../features/badge/roastBadge.js";

export async function runBadge(options) {
  const { repo, limit, name } = options;

  const spinner = ora("Computing your roast score...").start();
  let stats;
  try {
    stats = await analyzeRepo(repo, { limit: parseInt(limit) });
    spinner.succeed(chalk.green(`Analyzed ${stats.stats.totalCommits} commits.`));
  } catch (err) {
    spinner.fail(chalk.red("Analysis failed: " + err.message));
    process.exit(1);
  }

  const badge = generateBadge(stats, { outputDir: "./output", repoName: name || "my-repo" });

  const { score, label, emoji, badgeMd, badgeHtml, svgPath, shieldsUrl } = badge;

  const scoreColor = score >= 60 ? chalk.red.bold : score >= 30 ? chalk.yellow.bold : chalk.green.bold;

  console.log(chalk.bold("\n🏅 YOUR ROAST BADGE\n"));
  console.log(`  Score:   ${scoreColor(score + " / 100")}  ${emoji}  ${chalk.italic(label)}\n`);

  console.log(chalk.bold("  Shields.io URL:"));
  console.log(chalk.dim("  " + shieldsUrl + "\n"));

  console.log(chalk.bold("  README Markdown (copy-paste this):"));
  console.log(chalk.cyan("  " + badgeMd + "\n"));

  console.log(chalk.bold("  README HTML alternative:"));
  console.log(chalk.cyan("  " + badgeHtml + "\n"));

  console.log(chalk.dim(`  Self-hosted SVG saved → ${svgPath}`));
  console.log(chalk.dim("  Score history saved  → output/.roast-history.json\n"));

  if (score >= 60) {
    console.log(
      chalk.red.bold(
        "  ⚠️  Your roast score is dangerously high. Consider therapy. Or better commit messages.\n"
      )
    );
  } else if (score <= 15) {
    console.log(chalk.green("  ✓ Suspiciously clean repo. Are you even human?\n"));
  }
}
