import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import boxen from "boxen";
import { analyzeTodoGraveyard, roastTodos } from "../features/todoGraveyard.js";

// Load .env if present
dotenv.config();

export async function runTodoGraveyard(options) {
  const { repo, savage, minAge } = options;

  if (!process.env.GEMINI_API_KEY) {
    console.error(chalk.red("\n  ✗ Missing GEMINI_API_KEY\n"));
    process.exit(1);
  }

  const scanSpinner = ora("Excavating your TODO graveyard... 💀").start();
  let todos;
  try {
    todos = await analyzeTodoGraveyard(repo);
    const minAgeDays = parseInt(minAge) || 0;
    const filtered = todos.filter((t) => t.age >= minAgeDays);
    scanSpinner.succeed(
      chalk.green(
        `Found ${todos.length} TODOs. ${filtered.length} meet the age threshold. Yikes.`
      )
    );
    todos = filtered;
  } catch (err) {
    scanSpinner.fail(chalk.red("Failed to scan files: " + err.message));
    process.exit(1);
  }

  if (todos.length === 0) {
    console.log(
      chalk.green(
        "\n  ✓ No TODOs found. Either you're incredible or hiding them somewhere.\n"
      )
    );
    return;
  }

  console.log(chalk.bold("\n💀 TODO GRAVEYARD\n"));
  console.log(
    chalk.dim("  The following promises were made and never kept:\n")
  );

  todos.slice(0, 15).forEach((t, i) => {
    const ageColor = t.age > 365 ? chalk.red : t.age > 90 ? chalk.yellow : chalk.dim;
    console.log(
      `  ${chalk.dim(String(i + 1).padStart(2, "0"))}  ` +
        chalk.cyan(`[${t.type}]`) +
        " " +
        chalk.white(`\"${t.message}\"`) +
        "\n" +
        `      ${chalk.dim(t.file + ":" + t.line)}  ` +
        ageColor(`${t.ageLabel} old`)
    );
  });

  if (todos.length > 15) {
    console.log(
      chalk.dim(`\n  ...and ${todos.length - 15} more rotting in silence.\n`)
    );
  }

  const roastSpinner = ora("Generating eulogy for your broken promises...").start();
  let roast;
  try {
    roast = await roastTodos(todos);
    roastSpinner.succeed("Eulogy ready.");
  } catch (err) {
    roastSpinner.fail("Roast failed: " + err.message);
    return;
  }

  if (roast) {
    console.log(
      "\n" +
        boxen(
          [
            chalk.bold.red("💀 TODO EULOGY"),
            "",
            chalk.bold.white(roast.headline),
            "",
            chalk.white(roast.eulogy),
            "",
            chalk.dim("─".repeat(44)),
            chalk.yellow("Verdict: ") + chalk.italic(roast.verdict),
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
