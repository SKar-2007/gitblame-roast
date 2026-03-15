import simpleGit from "simple-git";
import chalk from "chalk";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Shame hours: late night / early morning
const SHAME_HOURS = new Set([0, 1, 2, 3, 4, 22, 23]);

/**
 * Builds a commit heatmap from git log.
 * Returns grid data + shame stats for terminal rendering.
 */
export async function buildHeatmap(repoPath = ".", limit = 500) {
  const git = simpleGit(repoPath);
  const rawLog = await git.raw(["log", `--max-count=${limit}`, "--format=%ad", "--date=iso"]);

  const dates = rawLog
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((d) => new Date(d.trim()));

  // Hour grid: 7 days x 24 hours
  const hourGrid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const weekGrid = {};
  const monthGrid = new Array(12).fill(0);
  const dayGrid = new Array(7).fill(0);

  let shameCommits = 0;
  let fridayEvening = 0;
  let mondayMorning = 0;

  for (const d of dates) {
    const h = d.getHours();
    const day = d.getDay();
    const mon = d.getMonth();

    hourGrid[day][h]++;
    monthGrid[mon]++;
    dayGrid[day]++;

    const weekKey = getWeekKey(d);
    weekGrid[weekKey] = (weekGrid[weekKey] || 0) + 1;

    if (SHAME_HOURS.has(h)) shameCommits++;
    if (day === 5 && h >= 16) fridayEvening++;
    if (day === 1 && h < 9) mondayMorning++;
  }

  let peakHour = 0;
  let peakCount = 0;
  for (let h = 0; h < 24; h++) {
    const total = hourGrid.reduce((sum, row) => sum + row[h], 0);
    if (total > peakCount) {
      peakCount = total;
      peakHour = h;
    }
  }

  const peakDay = dayGrid.indexOf(Math.max(...dayGrid));

  return {
    hourGrid,
    weekGrid,
    monthGrid,
    dayGrid,
    total: dates.length,
    shameCommits,
    fridayEvening,
    mondayMorning,
    peakHour,
    peakDay,
    oldestDate: dates[dates.length - 1],
    newestDate: dates[0],
  };
}

/** Render heatmap to terminal */
export function renderHeatmap(data) {
  const { hourGrid, monthGrid, dayGrid, total, shameCommits, fridayEvening, peakHour, peakDay } = data;

  console.log(chalk.bold("\n🗺️  COMMIT HEATMAP — When Do You Wreak Havoc?\n"));

  console.log(
    chalk.dim("  Day/Hour  " +
      Array.from({ length: 24 }, (_, i) => String(i).padStart(2)).join(" "))
  );
  console.log(chalk.dim("  " + "─".repeat(75)));

  for (let day = 0; day < 7; day++) {
    const label = chalk.dim(DAYS[day].padEnd(9));
    const cells = hourGrid[day]
      .map((count, h) => {
        const cell = count === 0 ? "·" : getHeatChar(count);
        if (SHAME_HOURS.has(h) && count > 0) return chalk.red(cell + " ");
        if (count === 0) return chalk.dim(cell + " ");
        return chalk.yellow(cell + " ");
      })
      .join("");
    console.log(`  ${label} ${cells}`);
  }

  console.log(
    chalk.dim(
      "\n  Legend: · none  " +
        chalk.yellow("░ low  ▒ mid  ▓ high  █ extreme") +
        "  " +
        chalk.red("red = shame hours (10pm–4am)")
    )
  );

  console.log(chalk.bold("\n  Monthly Activity\n"));
  const maxMonth = Math.max(...monthGrid);
  monthGrid.forEach((count, i) => {
    const bar = buildBar(count, maxMonth, 20);
    const isActive = count === maxMonth;
    console.log(
      `  ${chalk.dim(MONTHS[i])}  ${isActive ? chalk.yellow(bar) : chalk.dim(bar)} ${chalk.dim(String(count))}`
    );
  });

  console.log(chalk.bold("\n  🔥 Shame Stats\n"));
  printShameRow("Peak commit hour", `${peakHour}:00 ${peakHour >= 22 || peakHour <= 4 ? "💀" : ""}`, peakHour >= 22 || peakHour <= 4);
  printShameRow("Most active day", DAYS[peakDay], peakDay === 0 || peakDay === 6);
  printShameRow("Late-night commits", `${shameCommits} / ${total}`, shameCommits > total * 0.1);
  printShameRow("Friday-after-4pm pushes", fridayEvening, fridayEvening > 3);
  console.log();
}

function getHeatChar(n) {
  if (n <= 1) return "░";
  if (n <= 3) return "▒";
  if (n <= 6) return "▓";
  return "█";
}

function buildBar(value, max, width) {
  const filled = max > 0 ? Math.round((value / max) * width) : 0;
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function printShameRow(label, value, warn = false) {
  const v = warn ? chalk.red.bold(String(value)) : chalk.white(String(value));
  console.log(`  ${chalk.dim((label + ":").padEnd(28))} ${v}`);
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-${String(week).padStart(2, "0")}`;
}
