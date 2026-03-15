import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { analyzeRepo } from "../analyzers/gitAnalyzer.js";
import { generateWeeklyEmail } from "../features/email/weeklyEmail.js";

// Load .env if present
dotenv.config();

export async function runEmail(options) {
  const { repo, limit, outputDir, teamName, repoName } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Analyzing repo for weekly email stats...").start();
  let stats;
  try {
    stats = await analyzeRepo(repo, { limit: parseInt(limit) });
    scanSpinner.succeed(chalk.green(`Analyzed ${stats.stats.totalCommits} commits.`));
  } catch (err) {
    scanSpinner.fail(chalk.red("Email stats analysis failed: " + err.message));
    process.exit(1);
  }

  const roastSpinner = ora("Generating weekly email...\n").start();
  let result;
  try {
    result = await generateWeeklyEmail(stats, {
      outputDir: outputDir || "./output",
      teamName,
      repoName,
    });
    roastSpinner.succeed(chalk.green("Weekly email generated."));
  } catch (err) {
    roastSpinner.fail(chalk.red("Email generation failed: " + err.message));
    return;
  }

  console.log();
  console.log(
    boxen(
      [
        chalk.bold.yellow("📧 Weekly Digest Email Generated"),
        "",
        chalk.bold("File:"),
        chalk.green(result.filePath),
        "",
        chalk.bold("Subject:"),
        chalk.cyan(result.subject),
        "",
        chalk.bold("Intro:"),
        chalk.white(result.intro),
        "",
        chalk.bold("Highlight:"),
        chalk.magenta(result.highlight || "(not generated)"),
      ].join("\n"),
      {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      }
    )
  );
}
