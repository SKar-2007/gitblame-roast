import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzeRepo } from "../analyzers/gitAnalyzer.js";
import { analyzePersonality } from "../features/personality/personality.js";

// Load .env if present
dotenv.config();

export async function runPersonality(options) {
  const { repo, author, limit } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const spinner = ora("Analyzing your developer psyche...").start();
  let stats;
  try {
    stats = await analyzeRepo(repo, { limit: parseInt(limit) });
    spinner.succeed(chalk.green(`Surveyed ${stats.stats.totalCommits} commits. Your soul is in this.`));
  } catch (err) {
    spinner.fail(chalk.red("Analysis failed: " + err.message));
    process.exit(1);
  }

  const roastSpinner = ora("Summoning your personality archetype...").start();
  let profile;
  try {
    profile = await analyzePersonality(stats, author);
    roastSpinner.succeed(chalk.green("Profile assembled. Brace yourself."));
  } catch (err) {
    roastSpinner.fail("Failed to build personality profile: " + err.message);
    return;
  }

  console.log(chalk.bold("\n🧠 DEVELOPER PERSONALITY PROFILE\n"));
  console.log(`  ${chalk.bold(profile.type)} ${chalk.gray(profile.emoji)} — ${chalk.italic(profile.tagline)}\n`);
  console.log(chalk.bold("Traits:"));
  profile.traits.forEach((t) => console.log(`  • ${t}`));
  console.log();
  console.log(chalk.bold("Superpower:"), profile.superpower);
  console.log(chalk.bold("Fatal flaw:"), profile.fatalFlaw);
  console.log(chalk.bold("Spirit animal:"), profile.spiritAnimal);
  console.log(chalk.bold("Compatible with:"), profile.compatibility);
  console.log();
  console.log(chalk.dim(`Archetype: ${profile.archetype.name} — ${profile.archetype.description}`));
  if (profile.secondaryArchetype) {
    console.log(chalk.dim(`Secondary archetype: ${profile.secondaryArchetype.name}`));
  }
}
