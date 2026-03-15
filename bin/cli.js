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
import { runPersonality } from "../src/commands/personality.js";
import { runPRs } from "../src/commands/prs.js";
import { runTickets } from "../src/commands/tickets.js";
import { runReplay } from "../src/commands/replay.js";
import { runStreak } from "../src/commands/streak.js";
import { runEmail } from "../src/commands/email.js";
import { runDashboard } from "../src/commands/dashboard.js";

const header = gradient.passion(figlet.textSync("GitBlame Roast", { font: "Small" }));
const subtitle = chalk.dim("  🔥 Your codebase is about to catch these flames\n");

const isHelpMode = process.argv.includes("--help") || process.argv.includes("-h");
if (!isHelpMode) {
  console.log(header);
  console.log(subtitle);
}

program
  .name("gitblame-roast")
  .description("Roast your git history with AI 🔥")
  .version("3.0.0")
  .addHelpText("beforeAll", `${header}\n${subtitle}`);

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

program
  .command("personality")
  .description("Analyze your dev personality from commit history 🧠")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-a, --author <name>", "Only analyze a specific author")
  .option("-n, --limit <number>", "Commits to analyze", "200")
  .action(runPersonality);

program
  .command("prs")
  .description("Roast pull request merge messages 🧪")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Merge commits to analyze", "200")
  .action(runPRs);

program
  .command("tickets")
  .description("Detect ticket IDs in commit messages and roast the discipline 🎟️")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "200")
  .action(runTickets);

program
  .command("replay")
  .description("Show a week-by-week roast score timeline 🎬")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-w, --weeks <number>", "Weeks to include", "24")
  .action(runReplay);

program
  .command("streak")
  .description("Track your daily shame streak 🔥")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "300")
  .action(runStreak);

program
  .command("email")
  .description("Generate a savage weekly digest email ✉️")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .option("-n, --limit <number>", "Commits to analyze", "300")
  .option("-o, --output <dir>", "Output directory for email HTML", "./output")
  .option("--team <name>", "Team name to show in the email")
  .option("--repo-name <name>", "Repo name to show in the email")
  .action(runEmail);

program
  .command("dashboard")
  .description("Launch an interactive TUI dashboard")
  .option("-r, --repo <path>", "Path to the git repo", ".")
  .action(runDashboard);

program.parse();
