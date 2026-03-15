import chalk from "chalk";
import readline from "readline";
import { analyzeRepo } from "../../analyzers/gitAnalyzer.js";
import { buildHeatmap } from "../heatmap/commitHeatmap.js";
import { analyzeStreak } from "../streak/roastStreak.js";

const TABS = [
  { id: "overview", label: "Overview", emoji: "📊" },
  { id: "heatmap", label: "Heatmap", emoji: "🗺️" },
  { id: "authors", label: "Authors", emoji: "👥" },
  { id: "streak", label: "Streak", emoji: "🔥" },
  { id: "help", label: "Help", emoji: "❓" },
];

/**
 * Full-screen interactive TUI dashboard.
 * Navigate with arrow keys or number keys 1-5.
 * Press Q to quit.
 */
export async function launchTUI(repoPath = ".") {
  // Load all data upfront
  process.stdout.write(chalk.dim("\n  Loading dashboard data...\n"));
  const [stats, heatmap, streakData] = await Promise.all([
    analyzeRepo(repoPath, { limit: 300 }),
    buildHeatmap(repoPath, 300),
    analyzeStreak(repoPath, 300),
  ]);

  let activeTab = 0;

  // Setup raw mode for keypress
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);

  const render = () => {
    console.clear();
    renderHeader(activeTab);
    console.log();

    switch (TABS[activeTab].id) {
      case "overview":
        renderOverview(stats);
        break;
      case "heatmap":
        renderHeatmapTab(heatmap);
        break;
      case "authors":
        renderAuthorsTab(stats);
        break;
      case "streak":
        renderStreakTab(streakData);
        break;
      case "help":
        renderHelp();
        break;
    }

    renderFooter();
  };

  render();

  process.stdin.on("keypress", (str, key) => {
    if (!key) return;

    // Quit
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      console.clear();
      console.log(chalk.dim("\n  Dashboard closed. Your shame remains.\n"));
      process.exit(0);
    }

    // Tab navigation
    if (key.name === "right" || key.name === "tab") {
      activeTab = (activeTab + 1) % TABS.length;
      render();
    }
    if (key.name === "left") {
      activeTab = (activeTab - 1 + TABS.length) % TABS.length;
      render();
    }
    // Number keys 1-5
    if (str && /^[1-5]$/.test(str)) {
      activeTab = parseInt(str) - 1;
      render();
    }
  });
}

// ── Renders ────────────────────────────────────────────────────────

function renderHeader(activeTab) {
  const width = process.stdout.columns || 100;
  console.log(chalk.bold.red(" 🔥 GitBlame Roast Dashboard") + chalk.dim(` — Press Q to quit`));
  console.log(chalk.dim("─".repeat(width)));

  const tabs = TABS.map((tab, i) => {
    const label = ` ${tab.emoji} ${tab.label} `;
    return i === activeTab
      ? chalk.bgRed.white.bold(label)
      : chalk.dim(label);
  }).join(chalk.dim("│"));

  console.log(" " + tabs);
  console.log(chalk.dim("─".repeat(width)));
}

function renderFooter() {
  const width = process.stdout.columns || 100;
  console.log(chalk.dim("─".repeat(width)));
  console.log(chalk.dim("  ← → Arrow keys: navigate tabs  │  1-5: jump to tab  │  Q: quit"));
}

function renderOverview(stats) {
  const s = stats.stats;
  console.log(chalk.bold("  📊 REPO OVERVIEW\n"));

  const cols = [
    ["Total Commits", s.totalCommits, false],
    ["Late-Night (11pm-4am)", s.lateNightCommits, s.lateNightCommits > 10],
    ["Weekend Commits", s.weekendCommits, s.weekendCommits > 5],
    ["Lazy Messages", s.lazyMessages?.length ?? 0, (s.lazyMessages?.length ?? 0) > 10],
    ["Unique Authors", s.uniqueAuthors?.length ?? 0, false],
    ["Biggest Commit", `${s.biggestCommit?.filesChanged ?? 0} files`, (s.biggestCommit?.filesChanged ?? 0) > 50],
  ];

  cols.forEach(([label, value, warn]) => {
    const v = warn ? chalk.red.bold(String(value)) : chalk.white(String(value));
    console.log(`  ${chalk.dim((label + ":").padEnd(26))} ${v}`);
  });

  // Repeated messages
  if (s.repeatedMessages?.length) {
    console.log(chalk.bold("\n  Most Repeated Commit Messages\n"));
    s.repeatedMessages.forEach(([msg, count]) =>
      console.log(`  ${chalk.red(`"${msg}"`)} ${chalk.dim(`×${count}`)}`)
    );
  }
}

function renderHeatmapTab(heatmap) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHAME = new Set([0, 1, 2, 3, 4, 22, 23]);

  console.log(chalk.bold("  🗺️  COMMIT HEATMAP\n"));
  console.log(chalk.dim("  Day     " + Array.from({ length: 24 }, (_, i) => String(i).padStart(2)).join(" ")));

  for (let d = 0; d < 7; d++) {
    const label = chalk.dim(DAYS[d].padEnd(6));
    const cells = heatmap.hourGrid[d]
      .map((count, h) => {
        const c = count === 0 ? "·" : count <= 1 ? "░" : count <= 3 ? "▒" : count <= 6 ? "▓" : "█";
        if (SHAME.has(h) && count > 0) return chalk.red(c + " ");
        return count === 0 ? chalk.dim(c + " ") : chalk.yellow(c + " ");
      })
      .join("");
    console.log(`  ${label} ${cells}`);
  }

  console.log(chalk.dim("\n  Legend: · none  ░▒▓█ intensity  " + chalk.red("red = shame hours")));
  console.log(
    `\n  ${chalk.dim("Peak hour:")} ${chalk.yellow(heatmap.peakHour + ":00")}  ` +
      `${chalk.dim("Late-night commits:")} ${chalk.red(heatmap.shameCommits)} / ${chalk.dim(heatmap.total)}`
  );
}

function renderAuthorsTab(stats) {
  const s = stats.stats;
  console.log(chalk.bold("  👥 AUTHOR LEADERBOARD\n"));
  console.log(
    chalk.dim(
      "  " +
        "Author".padEnd(22) +
        "Commits".padEnd(10) +
        "Late Night".padEnd(12) +
        "Lazy Msgs".padEnd(12) +
        "Big Dumps"
    )
  );

  const authors = Object.entries(s.authorStats ?? {}).sort(
    (a, b) => (b[1].lateNight + b[1].lazy) - (a[1].lateNight + a[1].lazy)
  );

  authors.forEach(([author, data], i) => {
    const medal = i === 0 ? "💀" : i === 1 ? "🔥" : i === 2 ? "😬" : "  ";
    console.log(
      `  ${medal} ${chalk.white(author.slice(0, 20).padEnd(20))}` +
        `${chalk.dim(String(data.commits ?? 0).padEnd(10))}` +
        `${chalk.red(String(data.lateNight ?? 0).padEnd(12))}` +
        `${chalk.yellow(String(data.lazy ?? 0).padEnd(12))}` +
        `${chalk.magenta(String(data.bigDumps ?? 0))}`
    );
  });
}

function renderStreakTab(streak) {
  console.log(chalk.bold("  🔥 SHAME STREAK TRACKER\n"));

  const { currentStreak, longestStreak, longestStart, longestEnd, dayScores } = streak;

  console.log(
    `  ${chalk.dim("Current streak:")}  ${
      currentStreak > 0 ? chalk.red.bold(currentStreak + " days 🔥") : chalk.green("0 days ✓")
    }`
  );
  console.log(
    `  ${chalk.dim("Longest ever:")}    ${chalk.yellow.bold(longestStreak + " days")} ${
      longestStart ? chalk.dim(`(${longestStart} → ${longestEnd})`) : ""
    }`
  );

  if (dayScores?.length) {
    console.log(chalk.bold("\n  Recent 30 Days\n"));
    dayScores.slice(0, 20).forEach((d) => {
      const bar = d.isShameDay ? chalk.red("█ SHAME ") : chalk.green("░ clean ");
      const lazy = `${(d.lazyRatio * 100).toFixed(0)}% lazy`;
      console.log(
        `  ${chalk.dim(d.date)}  ${bar} ${chalk.dim(d.commits + " commits  " + lazy)}`
      );
    });
  }
}

function renderHelp() {
  console.log(chalk.bold("  ❓ KEYBOARD SHORTCUTS\n"));
  const shortcuts = [
    ["← →  /  Tab", "Navigate between tabs"],
    ["1", "Overview tab"],
    ["2", "Heatmap tab"],
    ["3", "Authors tab"],
    ["4", "Streak tab"],
    ["5", "This help screen"],
    ["Q  /  Ctrl+C", "Quit dashboard"],
  ];
  shortcuts.forEach(([key, desc]) =>
    console.log(`  ${chalk.cyan(key.padEnd(18))} ${chalk.dim(desc)}`)
  );

  console.log(chalk.bold("\n  📋 ALL CLI COMMANDS\n"));
  const cmds = [
    ["roast", "Core commit history roast"],
    ["todos", "Ancient TODO graveyard"],
    ["branches", "Branch naming crimes"],
    ["team", "Team leaderboard"],
    ["reverts", "Revert shame detector"],
    ["heatmap", "Commit shame calendar"],
    ["badge", "Generate README badge"],
    ["streak", "Shame streak tracker"],
    ["personality", "Developer personality type"],
    ["prs", "PR description analyzer"],
    ["tickets", "Jira/Linear ticket detector"],
    ["replay", "Roast score over time"],
    ["email", "Generate weekly digest email"],
    ["dashboard", "This TUI dashboard"],
  ];
  cmds.forEach(([cmd, desc]) =>
    console.log(`  ${chalk.yellow(("gitblame-roast " + cmd).padEnd(34))} ${chalk.dim(desc)}`)
  );
}
