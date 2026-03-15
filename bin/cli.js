#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import { runRoast } from "../src/commands/roast.js";
import { runTodoGraveyard } from "../src/commands/todos.js";
import { runBranchRoast } from "../src/commands/branches.js";
import { runTeamLeaderboard } from "../src/commands/team.js";
import { runRevertShame } from "../src/commands/reverts.js";
import { runHeatmap } from "../src/commands/heatmap.js";
import { runBadge } from "../src/commands/badge.js";

// Print the banner
console.log(
  gradient.passion(figlet.textSync("GitBlame Roast", { font: "Small" }))
);
console.log(chalk.dim("  🔥 Your codebase is about to catch these flames\n"));

program
  .name("gitblame-roast")
  .description("Roast your git history with AI 🔥")
  .version("3.0.0");

program
  .command("roast", { isDefault: true })
  .description("Roast your current repo")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-a, --author <name>", "Roast a specific author only")
  .option("-s, --savage", "No mercy mode 💀")
  .option("-n, --limit <number>", "Number of commits to analyze", "100")
  .option("--compliment", "Compliment mode (for fragile devs 🌸)")
  .option(
    "--share [output]",
    "Generate a shareable PNG card of the roast (default: roast.png)"
  )
  .option(
    "--json-output <file>",
    "Save roast results as JSON (for GitHub Actions or automation)"
  )
  .action(runRoast);

program
  .command("todos")
  .description("Excavate and roast your TODO graveyard 💀")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-s, --savage", "No mercy mode")
  .option(
    "--min-age <days>",
    "Only show TODOs older than N days",
    "0"
  )
  .action(runTodoGraveyard);

program
  .command("branches")
  .description("Roast your shameful branch names 🌿")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-s, --savage", "No mercy mode")
  .action(runBranchRoast);

program
  .command("team")
  .description("Rank and roast the entire team 👥")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "500")
  .option("-s, --savage", "No mercy mode")
  .action(runTeamLeaderboard);

program
  .command("reverts")
  .description("Expose and roast your revert history 🔁")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "200")
  .option("-s, --savage", "No mercy mode")
  .action(runRevertShame);

program
  .command("heatmap")
  .description("Visualize when you commit (shame calendar) 🗺️")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to map", "500")
  .option("-a, --author <n>", "Filter to one author")
  .action(runHeatmap);

program
  .command("badge")
  .description("Generate a roast score badge for your README 🏅")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "200")
  .option("--name <repoName>", "Repo name for badge link")
  .action(runBadge);

program.parse();
