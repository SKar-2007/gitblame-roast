import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzePRs, roastPRs } from "../features/pr/prAnalyzer.js";

// Load .env if present
dotenv.config();

export async function runPRs(options) {
  const { repo, limit } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Analyzing PR merge commits...").start();
  let data;
  try {
    data = await analyzePRs(repo, parseInt(limit));
    scanSpinner.succeed(
      chalk.green(`Found ${data.totalMerges} merge commits, ${data.emptyDescriptions} with lazy/no description.`)
    );
  } catch (err) {
    scanSpinner.fail(chalk.red("PR analysis failed: " + err.message));
    process.exit(1);
  }

  const roastSpinner = ora("Summoning brutal PR review roast...").start();
  let roast;
  try {
    roast = await roastPRs(data);
    roastSpinner.succeed(chalk.green("Roast is ready. Brace yourselves."));
  } catch (err) {
    roastSpinner.fail(chalk.red("Roast failed: " + err.message));
    return;
  }

  if (!roast) {
    console.log(chalk.yellow("\n  No merge commits found to roast.\n"));
    return;
  }

  console.log(chalk.bold("\n🧪 PR DESCRIPTION ROAST\n"));
  console.log(chalk.bold.red("HEADLINE:"), roast.headline);
  console.log(chalk.bold("ROAST:"), roast.roast);
  console.log(chalk.bold("WORST:"), roast.worst);
  console.log(chalk.bold("LESSON:"), roast.lesson);
}
