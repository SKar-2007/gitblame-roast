import chalk from "chalk";
import boxen from "boxen";
import { callGemini } from "../roast/geminiClient.js";

const SHAME_MEDALS = ["💀", "🔥", "😬", "😅", "🤡"];

/**
 * Builds a leaderboard of authors ranked by how roastable they are.
 * Higher score = more crimes against git.
 */
export function buildLeaderboard(stats) {
  const { authorStats } = stats.stats;

  const entries = Object.entries(authorStats).map(([author, data]) => {
    const score =
      data.lateNight * 3 + // 3pts per late-night commit
      data.lazy * 2 + // 2pts per lazy message
      data.bigDumps * 5 + // 5pts per massive code dump
      (data.commits > 100 ? 10 : 0); // bonus for sheer volume

    const badges = [];
    if (data.lateNight > 10) badges.push("🦉 Night Owl");
    if (data.lazy > 10) badges.push("🦥 Lazy Committer");
    if (data.bigDumps > 3) badges.push("💣 Code Bomber");
    if (data.commits > 200) badges.push("⌨️ Keyboard Warrior");
    if (score < 5) badges.push("🌸 Suspiciously Clean");

    return { author, ...data, score, badges };
  });

  entries.sort((a, b) => b.score - a.score);
  return entries;
}

/** Generate AI roasts for the full team */
export async function roastTeam(leaderboard) {
  if (leaderboard.length === 0) return null;

  const summary = leaderboard
    .slice(0, 6)
    .map((e, i) =>
      `${i + 1}. ${e.author}: score=${e.score}, lateNight=${e.lateNight}, lazyMsgs=${e.lazy}, bigDumps=${e.bigDumps}, commits=${e.commits}`
    )
    .join("\n");

  const prompt = `You are a savage HR bot reading out git crime stats at an all-hands meeting.\nRoast each team member based on their stats. Be brutally funny, give each person a savage developer nickname.\nFull savage mode — no mercy, no survivors.\n\nTEAM STATS LEADERBOARD:\n${summary}\n\nFormat EXACTLY like this (one block per person):\nPERSON_1_NAME: ${leaderboard[0]?.author}\nPERSON_1_TITLE: <savage developer title>\nPERSON_1_ROAST: <1-2 sentence roast, reference their specific numbers>\n\nPERSON_2_NAME: ${leaderboard[1]?.author || "N/A"}\nPERSON_2_TITLE: <savage developer title>\nPERSON_2_ROAST: <1-2 sentence roast>\n\n(continue for all persons)\n\nTEAM_VERDICT: <overall team roast, 2 sentences>`;

  const text = await callGemini({ prompt, maxOutputTokens: 900 });
  return parseTeamRoast(text, leaderboard);
}

function parseTeamRoast(text, leaderboard) {
  const roasts = leaderboard.map((member, i) => {
    const n = i + 1;
    const title =
      text.match(new RegExp(`PERSON_${n}_TITLE:\\s*(.+?)(?=\\n)`))?.[1]?.trim() ??
      "Unknown Criminal";
    const roast =
      text.match(
        new RegExp(`PERSON_${n}_ROAST:\\s*(.+?)(?=\\nPERSON_|\\nTEAM_|$)`, "s")
      )?.[1]?.trim() ?? "";
    return { ...member, title, roast };
  });

  const verdict = text.match(/TEAM_VERDICT:\s*(.+?)$/s)?.[1]?.trim() ?? "";
  return { roasts, verdict };
}

/** Renders the leaderboard to terminal */
export function renderLeaderboard(teamRoast, leaderboard) {
  console.log(chalk.bold.red("\n\n💀 TEAM ROAST LEADERBOARD — No Survivors\n"));
  console.log(chalk.dim("  Ranked by Roastability Score (higher = more crimes)\n"));

  teamRoast.roasts.forEach((member, i) => {
    const isMostCriminal = i === 0;
    const medal = isMostCriminal
      ? SHAME_MEDALS[0]
      : SHAME_MEDALS[i] ?? "👤";
    const borderColor = isMostCriminal ? "red" : "yellow";

    const content = [
      `${medal} ${chalk.bold(member.author)} — ${chalk.italic.yellow(`"${member.title}"`)}`,
      chalk.dim(
        `   Score: ${member.score} | Commits: ${member.commits} | Late Nights: ${member.lateNight} | Lazy Msgs: ${member.lazy} | Big Dumps: ${member.bigDumps}`
      ),
      "",
      chalk.white(`   ${member.roast}`),
      member.badges.length ? chalk.dim(`\n   ${member.badges.join("  ")}`) : "",
    ]
      .filter(Boolean)
      .join("\n");

    console.log(
      boxen(content, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        margin: { top: 0, bottom: 1, left: 2, right: 0 },
        borderStyle: isMostCriminal ? "double" : "single",
        borderColor,
      })
    );
  });

  if (teamRoast.verdict) {
    console.log(
      boxen(chalk.bold.red("🏆 TEAM VERDICT\n\n") + chalk.white(teamRoast.verdict), {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 2, right: 0 },
        borderStyle: "double",
        borderColor: "red",
      })
    );
  }
}
