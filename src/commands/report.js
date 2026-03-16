import ora    from "ora";
import chalk  from "chalk";
import { loadConfig, mergeWithCLI } from "../features/config/roastConfig.js";
import { generatePDFReport }        from "../features/pdf/pdfReport.js";

export async function runPDFReport(options) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing ANTHROPIC_API_KEY\n")); process.exit(1);
  }

  // Load .roastrc.json and merge with CLI flags
  const { config, foundAt } = loadConfig(options.repo ?? ".");
  const cfg = mergeWithCLI(config, options);

  if (foundAt) console.log(chalk.dim(`\n  📄 Config loaded from: ${foundAt}`));

  console.log(chalk.bold("\n📋 MONTHLY ROAST REPORT CARD\n"));
  console.log(chalk.dim("  Running all analyzers — this will take ~30 seconds...\n"));

  const steps = [
    "Analyzing commit history...",
    "Building heatmap...",
    "Scanning TODOs...",
    "Checking branches...",
    "Generating AI roast...",
    "Computing personality type...",
    "Rendering PDF...",
  ];

  let stepIdx  = 0;
  const spinner = ora(steps[0]).start();

  // Progress ticker
  const ticker = setInterval(() => {
    stepIdx = Math.min(stepIdx + 1, steps.length - 1);
    spinner.text = steps[stepIdx];
  }, 4500);

  let result;
  try {
    result = await generatePDFReport({
      repoPath:  cfg.repo,
      author:    cfg.author,
      outputDir: cfg.outputDir,
      limit:     cfg.limit,
      savage:    cfg.savage,
    });
    clearInterval(ticker);
    spinner.succeed(chalk.green("PDF report generated!"));
  } catch (err) {
    clearInterval(ticker);
    spinner.fail(chalk.red("Report generation failed."));
    console.error(chalk.dim(`\n  Error: ${err.message}\n`));
    console.error(chalk.dim("  Make sure Python 3 + reportlab are installed:"));
    console.error(chalk.dim("  pip3 install reportlab\n"));
    process.exit(1);
  }

  console.log(chalk.bold("\n  ✓ Report ready!\n"));
  console.log(`  ${chalk.dim("PDF path:")}  ${chalk.cyan(result.pdfPath)}`);
  console.log(`  ${chalk.dim("Score:")}     ${chalk.yellow.bold(result.payload.score + "/100")}`);
  console.log(`  ${chalk.dim("Month:")}     ${chalk.white(result.payload.month)}`);
  console.log(chalk.dim("\n  Open the PDF or share it with your team. They deserve to know.\n"));
}
