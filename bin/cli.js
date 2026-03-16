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
import { runStreak } from "../src/commands/streak.js";
import { runPersonality } from "../src/commands/personality.js";
import { runPRs } from "../src/commands/prs.js";
import { runTickets } from "../src/commands/tickets.js";
import { runReplay } from "../src/commands/replay.js";
import { runEmail } from "../src/commands/email.js";
import { runDashboard } from "../src/commands/dashboard.js";
import { runPDFReport } from "../src/commands/report.js";
import { runConfigInit, runConfigShow } from "../src/commands/config.js";

console.log(gradient.passion(figlet.textSync("GitBlame Roast", { font: "Small" })));
console.log(chalk.dim("  💀 v5.0 — 16 commands · Config system · PDF Report Card\n"));

program
  .name("gitblame-roast")
  .description("Roast your git history with AI 🔥  |  npx gitblame-roast")
  .version("5.0.0");

// ── Core ───────────────────────────────────────────────────────
program.command("roast", { isDefault: true })
  .description("Roast your commit history (default)")
  .option("-r, --repo <path>",    "Repo path",            ".")
  .option("-a, --author <n>",     "Filter to one author")
  .option("-s, --savage",         "No mercy mode 💀")
  .option("-n, --limit <number>", "Commits to analyze",   "100")
  .option("--compliment",         "Compliment mode 🌸")
  .option("--card",               "Generate shareable HTML card")
  .option("--png",                "Export PNG (needs puppeteer)")
  .option("--json-output <file>", "Save JSON for GitHub Action")
  .action(runRoast);

program.command("todos").description("Roast ancient TODO comments 💀")
  .option("-r, --repo <path>",".",).option("-s, --savage").option("--min-age <days>","0")
  .action(runTodoGraveyard);

program.command("branches").description("Roast shameful branch names 🌿")
  .option("-r, --repo <path>",".",).option("-s, --savage").action(runBranchRoast);

program.command("team").description("Rank & roast the whole team 👥")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","500").option("-s, --savage")
  .action(runTeamLeaderboard);

program.command("reverts").description("Expose revert shame 🔁")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","200").option("-s, --savage")
  .action(runRevertShame);

program.command("heatmap").description("Commit shame calendar 🗺️")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","500").action(runHeatmap);

program.command("badge").description("Generate README roast badge 🏅")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","200").option("--name <repo>")
  .action(runBadge);

program.command("streak").description("Track your shame streak 🔥")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","300").option("-s, --savage")
  .action(runStreak);

program.command("personality").description("Developer personality type 🧬")
  .option("-r, --repo <path>",".",).option("-a, --author <n>").option("-n, --limit <number>","200")
  .action(runPersonality);

program.command("prs").description("Roast PR descriptions 📝")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","200").option("-s, --savage")
  .action(runPRs);

program.command("tickets").description("Detect missing ticket refs 🎫")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","200").option("-s, --savage")
  .action(runTickets);

program.command("replay").description("Roast score timelapse 🎬")
  .option("-r, --repo <path>",".",).option("-w, --weeks <number>","24").action(runReplay);

program.command("email").description("Generate weekly digest email 📧")
  .option("-r, --repo <path>",".",).option("-n, --limit <number>","200")
  .option("--team <n>","The Team").option("--name <repo>","your-repo").action(runEmail);

program.command("dashboard").description("Interactive TUI dashboard 📺")
  .option("-r, --repo <path>",".").action(runDashboard);

// ── NEW v5 ──────────────────────────────────────────────────────
program.command("report").description("Generate monthly PDF report card 📋")
  .option("-r, --repo <path>",    "Repo path",         ".")
  .option("-a, --author <n>",     "Filter to one author")
  .option("-n, --limit <number>", "Commits to analyze","300")
  .option("-s, --savage",         "No mercy mode 💀")
  .option("-o, --output <dir>",   "Output directory",  "./output")
  .action(runPDFReport);

// ── Config commands ─────────────────────────────────────────────
const cfg = program.command("config").description("Manage .roastrc.json config ⚙️");

cfg.command("init")
  .description("Create a starter .roastrc.json in current directory")
  .option("-d, --dir <path>", "Where to create the config", ".")
  .action(runConfigInit);

cfg.command("show")
  .description("Show the active config for a repo")
  .option("-r, --repo <path>", "Repo path", ".")
  .action(runConfigShow);

program.parse();
