import ora from "ora";
import chalk from "chalk";
import { buildHeatmap, renderHeatmap } from "../features/heatmap/commitHeatmap.js";

export async function runHeatmap(options) {
  const { repo, limit, author } = options;

  const spinner = ora("Building your shame calendar...").start();
  let data;
  try {
    data = await buildHeatmap(repo, parseInt(limit));
    spinner.succeed(chalk.green(`Mapped ${data.total} commits across time. Brace yourself.`));
  } catch (err) {
    spinner.fail(chalk.red("Heatmap failed: " + err.message));
    process.exit(1);
  }

  renderHeatmap(data);
}
