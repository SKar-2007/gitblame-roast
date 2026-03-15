import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzeRepo } from "../analyzers/gitAnalyzer.js";
import {
  buildLeaderboard,
  roastTeam,
  renderLeaderboard,
} from "../features/teamLeaderboard.js";

// Load .env if present
dotenv.config();

export async function runTeamLeaderboard(options) {
  const { repo, limit, savage } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const analyzeSpinner = ora(
    `Analyzing team's collective sins (last ${limit} commits)...`
  ).start();
  let stats;
  try {
    stats = await analyzeRepo(repo, { limit: parseInt(limit) });
    const authors = stats.stats.uniqueAuthors.length;
    analyzeSpinner.succeed(
      chalk.green(
        `Analyzed ${stats.stats.totalCommits} commits across ${authors} author(s).`
      )
    );
  } catch (err) {
    analyzeSpinner.fail(chalk.red("Failed to analyze repo: " + err.message));
    process.exit(1);
  }

  const leaderboard = buildLeaderboard(stats);

  if (leaderboard.length === 0) {
    console.log(
      chalk.yellow("\n  No authors found. Ghost commits? Impressive.\n")
    );
    return;
  }

  const roastSpinner = ora(
    `Preparing public humiliation for ${leaderboard.length} team member(s)...`
  ).start();
  let teamRoast;
  try {
    teamRoast = await roastTeam(leaderboard);
    roastSpinner.succeed("Roasts ready. No one is safe.");
  } catch (err) {
    roastSpinner.fail("Team roast failed: " + err.message);
    return;
  }

  renderLeaderboard(teamRoast, leaderboard);
}
