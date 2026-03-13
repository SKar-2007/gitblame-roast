import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export async function generateShareCard(roastData, stats, options = {}) {
  const { savage, compliment, output = "roast.png" } = options;

  const resolvedOutput = path.resolve(process.cwd(), output);
  const html = buildShareHtml(roastData, stats, { savage, compliment });

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT });

  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: resolvedOutput, type: "png" });
  await browser.close();

  return resolvedOutput;
}

function buildShareHtml(roastData, stats, options) {
  const { savage, compliment } = options;
  const c = stats.stats;
  const roastLevel = getRoastLevel(c, savage);

  const colors = {
    background: compliment ? "#e7ffef" : savage ? "#1b0a0a" : "#0b1224",
    text: compliment ? "#0f2d0f" : savage ? "#fcdedb" : "#f5f8ff",
    accent: compliment ? "#2f9d58" : savage ? "#ff4d4d" : "#5ab1ff",
    border: compliment ? "#c7f0d6" : savage ? "#561313" : "#1f3a5f",
  };

  const roastLevelLabel = {
    low: "MEDIUM RARE",
    medium: "WELL DONE",
    high: "EXTRA CRISPY",
    savage: "BURNT TO ASH",
  }[roastLevel];

  const safe = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const statRow = (label, value) =>
    `<tr><td class="stat-label">${safe(label)}</td><td class="stat-value">${safe(value)}</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GitBlame Roast</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        width: ${CARD_WIDTH}px;
        height: ${CARD_HEIGHT}px;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: ${colors.text};
        background: ${colors.background};
      }
      .container {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 32px;
        padding: 40px;
        height: 100%;
      }
      .left {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .header {
        font-size: 44px;
        font-weight: 900;
        letter-spacing: -1px;
        margin: 0;
      }
      .sub {
        margin-top: 12px;
        font-size: 18px;
        opacity: 0.84;
      }
      .card {
        background: rgba(0,0,0,0.16);
        border: 2px solid ${colors.border};
        border-radius: 18px;
        padding: 26px;
        box-shadow: 0 18px 80px rgba(0,0,0,0.3);
      }
      .card h2 {
        margin: 0 0 12px;
        font-size: 24px;
        letter-spacing: -0.5px;
      }
      .card p {
        margin: 8px 0;
        line-height: 1.45;
      }
      .stats {
        margin-top: 16px;
        width: 100%;
        border-collapse: collapse;
      }
      .stats td { padding: 6px 8px; }
      .stat-label { opacity: 0.7; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .stat-value { text-align: right; font-weight: 700; }
      .footer {
        margin-top: 18px;
        font-size: 14px;
        opacity: 0.75;
      }
      .badge {
        display: inline-block;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.15);
        color: ${colors.accent};
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="left">
        <div>
          <h1 class="header">🔥 GitBlame Roast</h1>
          <p class="sub">A brutally honest look at your git history — now shareable.</p>
        </div>
        <div class="card">
          <h2>🔥 The Roast</h2>
          <p><strong>${safe(roastData.opening)}</strong></p>
          <p>${safe(roastData.roast)}</p>
          <p><em>${safe(roastData.closing)}</em></p>
          <p class="footer">Title: <strong>${safe(roastData.title)}</strong></p>
          <p class="footer">Worst commit: <em>${safe(roastData.worstCommit)}</em></p>
        </div>
        <div class="footer">
          <span class="badge">${safe(roastLevelLabel)}</span>
        </div>
      </div>

      <div class="right">
        <div class="card">
          <h2>Stats</h2>
          <table class="stats">
            ${statRow("Commits analyzed", c.totalCommits)}
            ${statRow("Late-night commits", c.lateNightCommits)}
            ${statRow("Weekend commits", c.weekendCommits)}
            ${statRow("Lazy commit messages", c.lazyMessages.length)}
          </table>
          <div class="footer">
            Generated by GitBlame Roast
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

function getRoastLevel(s, savage) {
  if (savage) return "savage";
  const score =
    (s.lateNightCommits > 15 ? 1 : 0) +
    (s.lazyMessages.length > 10 ? 1 : 0) +
    (s.biggestCommit?.filesChanged > 50 ? 1 : 0);
  if (score >= 2) return "high";
  if (score === 1) return "medium";
  return "low";
}
