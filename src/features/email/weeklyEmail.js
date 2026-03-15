import fs from "fs";
import path from "path";
import { callGemini } from "../../roast/geminiClient.js";

export async function generateWeeklyEmail(stats, options = {}) {
  const { outputDir = "./output", teamName = "The Team", repoName = "your-repo" } = options;
  const s = stats.stats;

  const prompt = `You're writing a savage weekly git digest email subject + intro for a dev team.\nStats this week:\n- ${s.totalCommits} commits\n- ${s.lateNightCommits} late-night commits\n- ${s.lazyMessages?.length ?? 0} lazy commit messages\n- ${s.weekendCommits} weekend commits\n- ${s.biggestCommit?.filesChanged ?? 0} files in the biggest single commit\n\nGenerate:\nSUBJECT: <email subject line, funny and savage, max 60 chars>\nINTRO: <2-3 sentence intro paragraph, like a sarcastic newsletter editor>\nHIGHLIGHT: <one highlight stat presented as a "achievement unlocked" style callout>`;

  const text = await callGemini({ prompt, maxOutputTokens: 400 });
  const ex = (k) =>
    text.match(new RegExp(`${k}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"))?.[1]?.trim() ?? "";

  const subject = ex("SUBJECT") || "Your Weekly Git Crimes Report 🔥";
  const intro = ex("INTRO") || "Another week, another git disaster.";
  const highlight = ex("HIGHLIGHT") || "You committed at 3am again. Incredible.";

  const html = buildEmailHTML({ subject, intro, highlight, stats: s, teamName, repoName });

  fs.mkdirSync(outputDir, { recursive: true });
  const filename = `roast-email-${new Date().toISOString().slice(0, 10)}.html`;
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, html, "utf-8");

  return { filePath, subject, intro, highlight };
}

function buildEmailHTML({ subject, intro, highlight, stats: s, teamName, repoName }) {
  const week = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const authorRows = Object.entries(s.authorStats ?? {})
    .sort((a, b) => (b[1].lazy + b[1].lateNight) - (a[1].lazy + a[1].lateNight))
    .slice(0, 6)
    .map(([author, data], i) => `
      <tr style="background:${i % 2 === 0 ? "#1a1a2e" : "#16213e"}">
        <td style="padding:10px 16px;color:#94a3b8;">${i === 0 ? "💀" : i === 1 ? "🔥" : "😬"} ${author}</td>
        <td style="padding:10px 16px;text-align:center;color:#f97316;font-weight:bold;">${data.commits ?? 0}</td>
        <td style="padding:10px 16px;text-align:center;color:#ef4444;">${data.lateNight ?? 0}</td>
        <td style="padding:10px 16px;text-align:center;color:#f59e0b;">${data.lazy ?? 0}</td>
      </tr>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7f1d1d,#111827);border-radius:12px;padding:32px;margin-bottom:24px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🔥</div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 4px;">GitBlame Roast</h1>
      <p style="color:#f97316;font-size:13px;margin:0;letter-spacing:2px;text-transform:uppercase;">Weekly Digest — ${week}</p>
      <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">${teamName} · ${repoName}</p>
    </div>

    <!-- Intro -->
    <div style="background:#111827;border:1px solid #374151;border-radius:10px;padding:24px;margin-bottom:20px;">
      <p style="color:#e5e7eb;font-size:15px;line-height:1.7;margin:0;">${intro}</p>
    </div>

    <!-- Highlight callout -->
    <div style="background:#1f2937;border-left:4px solid #f97316;border-radius:0 10px 10px 0;padding:16px 20px;margin-bottom:20px;">
      <p style="color:#f97316;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px;">🏆 Achievement Unlocked</p>
      <p style="color:#fef3c7;font-size:14px;margin:0;font-style:italic;">${highlight}</p>
    </div>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px;">
      ${statCard("Total Commits", s.totalCommits, "#3b82f6")}
      ${statCard("Late-Night Commits", s.lateNightCommits, "#ef4444")}
      ${statCard("Lazy Messages", s.lazyMessages?.length ?? 0, "#f59e0b")}
      ${statCard("Weekend Commits", s.weekendCommits, "#8b5cf6")}
    </div>

    ${s.biggestCommit ? `
    <div style="background:#111827;border:1px solid #374151;border-radius:10px;padding:20px;margin-bottom:20px;">
      <p style="color:#6b7280;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">💣 Biggest Single Commit</p>
      <p style="color:#f97316;font-size:22px;font-weight:bold;margin:0 0 4px;">${s.biggestCommit.filesChanged} files changed</p>
      <p style="color:#9ca3af;font-size:13px;font-style:italic;margin:0;">"${s.biggestCommit.message}"</p>
    </div>` : ""}

    ${authorRows ? `
    <div style="background:#111827;border:1px solid #374151;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <div style="padding:16px 20px;border-bottom:1px solid #374151;">
        <p style="color:#e5e7eb;font-weight:bold;font-size:14px;margin:0;">👥 Team Shame Leaderboard</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#1e293b;">
            <th style="padding:10px 16px;text-align:left;color:#6b7280;font-size:12px;font-weight:600;">Author</th>
            <th style="padding:10px 16px;text-align:center;color:#6b7280;font-size:12px;font-weight:600;">Commits</th>
            <th style="padding:10px 16px;text-align:center;color:#6b7280;font-size:12px;font-weight:600;">Late Night</th>
            <th style="padding:10px 16px;text-align:center;color:#6b7280;font-size:12px;font-weight:600;">Lazy Msgs</th>
          </tr>
        </thead>
        <tbody>${authorRows}</tbody>
      </table>
    </div>` : ""}

    <div style="text-align:center;padding-top:24px;border-top:1px solid #1f2937;">
      <p style="color:#374151;font-size:12px;">Generated by <span style="color:#f97316;">gitblame-roast</span> · <a href="https://github.com/yourusername/gitblame-roast" style="color:#6b7280;">github</a></p>
      <p style="color:#374151;font-size:11px;">You're receiving this because someone on your team set up gitblame-roast. You're welcome.</p>
    </div>
  </div>
</body>
</html>`;
}

function statCard(label, value, color) {
  return `<div style="background:#111827;border:1px solid #374151;border-radius:10px;padding:20px;text-align:center;">
    <div style="font-size:28px;font-weight:bold;color:${color};">${value}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:1px;">${label}</div>
  </div>`;
}
