#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import { runRoast } from "../src/commands/roast.js";

// Print the banner
console.log(
  gradient.passion(figlet.textSync("GitBlame Roast", { font: "Small" }))
);
console.log(chalk.dim("  🔥 Your codebase is about to catch these flames\n"));

program
  .name("gitblame-roast")
  .description("Roast your git history with AI 🔥")
  .version("1.0.0");

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
  .action(runRoast);

program.parse();
