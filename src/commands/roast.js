import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzeRepo } from "../analyzers/gitAnalyzer.js";
import { generateRoast } from "../roast/aiRoaster.js";
import { renderRoast } from "../utils/renderer.js";

// Load .env file if present (safe local dev storage for API keys)
dotenv.config();

/**
 * Main command handler — orchestrates analysis → roast → render.
 */
export async function runRoast(options) {
  const { repo, author, savage, compliment, limit, share } = options;

  // ─── Check for API key ────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.error(
      chalk.red("\n  ✗ Missing API key environment variable.\n") +
        chalk.dim(
          "  Set your Gemini key:\n" +
            "  export GEMINI_API_KEY=your_key_here\n"
        )
    );
    process.exit(1);
  }

  // ─── Step 1: Analyze repo ─────────────────────────────────────────
  const analyzeSpinner = ora({
    text: "Digging through your crimes against version control...",
    color: "yellow",
  }).start();

  let stats;
  try {
    stats = await analyzeRepo(repo, { author, limit: parseInt(limit) });
    analyzeSpinner.succeed(
      chalk.green(`Analyzed ${stats.stats.totalCommits} commits. Oh boy.`)
    );
  } catch (err) {
    analyzeSpinner.fail(chalk.red("Failed to read git history."));
    console.error(chalk.dim(`  Error: ${err.message}`));
    console.error(chalk.dim("  Make sure you're in a git repo (or pass --repo <path>)"));
    process.exit(1);
  }

  // ─── Early exit if no commits ─────────────────────────────────────
  if (stats.commits.length === 0) {
    console.log(chalk.yellow("\n  No commits found. Nothing to roast. Yet."));
    process.exit(0);
  }

  // ─── Step 2: Generate roast ───────────────────────────────────────
  const roastSpinner = ora({
    text: savage
      ? "Loading maximum cruelty... 💀"
      : "Crafting your personalized humiliation...",
    color: "red",
  }).start();

  let roastData;
  try {
    roastData = await generateRoast(stats, {
      savage,
      compliment,
      author,
    });
    roastSpinner.succeed(chalk.green("Roast ready. Brace yourself."));
  } catch (err) {
    roastSpinner.fail(chalk.red("Failed to generate roast."));
    console.error(chalk.dim(`  Error: ${err.message}`));
    process.exit(1);
  }

  // ─── Step 3: Render output ────────────────────────────────────────
  await renderRoast(roastData, stats, { savage, compliment, share });
}
