import ora from "ora";
import chalk from "chalk";
import { buildReplay, renderReplay } from "../features/replay/replay.js";

export async function runReplay(options) {
  const { repo, weeks } = options;

  const spinner = ora("Building roast replay timeline...").start();
  let timeline;
  try {
    timeline = await buildReplay(repo, parseInt(weeks));
    spinner.succeed(chalk.green("Timeline built."));
  } catch (err) {
    spinner.fail(chalk.red("Replay failed: " + err.message));
    process.exit(1);
  }

  await renderReplay(timeline);
}
