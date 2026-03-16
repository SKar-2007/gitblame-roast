import chalk from "chalk";
import { initConfig, loadConfig, validateConfig } from "../features/config/roastConfig.js";

export async function runConfigInit(options) {
  const { dir = "." } = options;
  const result = initConfig(dir);

  if (!result.created) {
    console.log(chalk.yellow(`\n  ⚠️  .roastrc.json already exists at: ${result.path}\n`));
    console.log(chalk.dim("  Delete it and re-run to regenerate.\n"));
    return;
  }

  console.log(chalk.green(`\n  ✓ Created .roastrc.json at: ${result.path}\n`));
  console.log(chalk.dim("  Edit it to customize thresholds, ignored authors, and features.\n"));
}

export async function runConfigShow(options) {
  const { repo = "." } = options;
  const { config, foundAt } = loadConfig(repo);
  const warnings = validateConfig(config);

  console.log(chalk.bold("\n⚙️  ACTIVE CONFIGURATION\n"));

  if (foundAt) {
    console.log(`  ${chalk.dim("Loaded from:")}  ${chalk.cyan(foundAt)}\n`);
  } else {
    console.log(chalk.dim("  No .roastrc.json found — using all defaults.\n"));
    console.log(chalk.dim("  Run: gitblame-roast config init  to create one.\n"));
  }

  // Display key settings
  const rows = [
    ["repo",               config.repo],
    ["limit",              config.limit],
    ["savage",             config.savage],
    ["outputDir",          config.outputDir],
    ["ignoreAuthors",      (config.ignoreAuthors ?? []).join(", ") || "none"],
    ["late hour range",    `${config.thresholds.lateHourStart}:00 – ${config.thresholds.lateHourEnd}:00`],
    ["bigCommitFiles",     config.thresholds.bigCommitFiles],
    ["oldTodoDays",        config.thresholds.oldTodoDays],
    ["shameStreakDays",     config.thresholds.shameStreakDays],
    ["customLazyPatterns", (config.customLazyPatterns ?? []).join(", ") || "none"],
  ];

  rows.forEach(([k, v]) => {
    console.log(`  ${chalk.dim((k + ":").padEnd(24))} ${chalk.white(String(v))}`);
  });

  console.log(chalk.bold("\n  Feature Toggles\n"));
  Object.entries(config.features ?? {}).forEach(([k, v]) => {
    const icon = v ? chalk.green("✓") : chalk.red("✗");
    console.log(`  ${icon}  ${chalk.dim(k)}`);
  });

  if (warnings.length > 0) {
    console.log(chalk.bold.yellow("\n  ⚠️  Config Warnings\n"));
    warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
  }

  console.log();
}
