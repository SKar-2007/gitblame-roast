import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { analyzeBranches, roastBranches } from "../features/branchRoaster.js";

// Load .env if present
dotenv.config();

export async function runBranchRoast(options) {
  const { repo, savage } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Cataloguing your branch naming crimes...").start();
  let branchData;
  try {
    branchData = await analyzeBranches(repo);
    scanSpinner.succeed(
      chalk.green(
        `Found ${branchData.total} branches. ${branchData.shamed.length} are criminal.`
      )
    );
  } catch (err) {
    scanSpinner.fail(chalk.red("Failed to read branches: " + err.message));
    process.exit(1);
  }

  console.log(chalk.bold("\n🌿 BRANCH CRIME REPORT\n"));

  if (branchData.shamed.length === 0) {
    console.log(chalk.green("  Somehow your branch names are fine. Suspicious.\n"));
  } else {
    branchData.shamed.slice(0, 10).forEach((b, i) => {
      console.log(`  ${chalk.dim(String(i + 1).padStart(2))}  ${chalk.red(b.name)}`);
      if (b.crimes.length) {
        b.crimes.forEach((c) => console.log(chalk.dim(`        ↳ ${c}`)));
      }
    });
    if (branchData.shamed.length > 10) {
      console.log(
        chalk.dim(
          `\n  ...and ${branchData.shamed.length - 10} more shameful branches.\n`
        )
      );
    }
  }

  const roastSpinner = ora("Composing the verdict...").start();
  let roast;
  try {
    roast = await roastBranches(branchData);
    roastSpinner.succeed("Verdict ready.");
  } catch (err) {
    roastSpinner.fail("Roast failed: " + err.message);
    return;
  }

  if (roast) {
    console.log(
      "\n" +
        boxen(
          [
            chalk.bold.red("🌿 BRANCH ROAST"),
            "",
            chalk.bold.white(roast.opener),
            "",
            chalk.white(roast.roast),
            "",
            chalk.dim("─".repeat(44)),
            chalk.yellow("Worst Branch: ") + chalk.italic(roast.worst),
            "",
            chalk.dim("Sentence: ") + chalk.italic.dim(roast.sentence),
          ].join("\n"),
          {
            padding: 1,
            margin: 1,
            borderStyle: "double",
            borderColor: savage ? "red" : "yellow",
          }
        )
    );
  }
}
