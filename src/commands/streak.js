import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzeStreak, roastStreak } from "../features/streak/roastStreak.js";

// Load .env if present
dotenv.config();

export async function runStreak(options) {
  const { repo, limit } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Analyzing shame streak...").start();
  let data;
  try {
    data = await analyzeStreak(repo, parseInt(limit));
    scanSpinner.succeed(
      chalk.green(`Current streak: ${data.currentStreak} days. Longest: ${data.longestStreak} days.`)
    );
  } catch (err) {
    scanSpinner.fail(chalk.red("Streak analysis failed: " + err.message));
    process.exit(1);
  }

  const roastSpinner = ora("Crafting streak roast...").start();
  let roast;
  try {
    roast = await roastStreak(data);
    roastSpinner.succeed(chalk.green("Roast ready."));
  } catch (err) {
    roastSpinner.fail(chalk.red("Roast failed: " + err.message));
    return;
  }

  if (!roast) {
    console.log(chalk.yellow("\n  Not enough data to roast.\n"));
    return;
  }

  console.log(chalk.bold("\n🔥 SHAME STREAK ROAST\n"));
  console.log(chalk.bold.red("OPENER:"), roast.opener);
  console.log(chalk.bold("ROAST:"), roast.roast);
  console.log(chalk.bold("ADVICE:"), roast.advice);
}
