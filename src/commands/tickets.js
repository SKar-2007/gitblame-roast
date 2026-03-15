import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import { analyzeTickets, roastTickets } from "../features/tickets/ticketDetector.js";

// Load .env if present
dotenv.config();

export async function runTickets(options) {
  const { repo, limit } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Scanning commit messages for ticket IDs...").start();
  let data;
  try {
    data = await analyzeTickets(repo, parseInt(limit));
    scanSpinner.succeed(
      chalk.green(`Found ${data.withTickets} commits referencing tickets and ${data.withoutTickets} without.`)
    );
  } catch (err) {
    scanSpinner.fail(chalk.red("Ticket analysis failed: " + err.message));
    process.exit(1);
  }

  const roastSpinner = ora("Generating ticket discipline roast...").start();
  let roast;
  try {
    roast = await roastTickets(data);
    roastSpinner.succeed(chalk.green("Roast generated."));
  } catch (err) {
    roastSpinner.fail(chalk.red("Roast failed: " + err.message));
    return;
  }

  if (!roast) {
    console.log(chalk.yellow("\n  No commits found to roast.\n"));
    return;
  }

  console.log(chalk.bold("\n🎟️ TICKET DISCIPLINE ROAST\n"));
  console.log(chalk.bold.red("HEADLINE:"), roast.headline);
  console.log(chalk.bold("ROAST:"), roast.roast);
  console.log(chalk.bold("FAKE TICKET ROAST:"), roast.fakeTicketRoast);
  console.log(chalk.bold("VERDICT:"), roast.verdict);
}
