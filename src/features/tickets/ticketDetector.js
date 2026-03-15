import simpleGit from "simple-git";
import { callGemini } from "../../roast/geminiClient.js";

const TICKET_PATTERNS = [
  { name: "Jira", regex: /\b([A-Z]{2,10}-\d{1,6})\b/g },
  { name: "Linear", regex: /\b([A-Z]{2,5}-\d{3,6})\b/g },
  { name: "GitHub", regex: /#(\d{1,6})\b/g },
  { name: "Shortcut", regex: /\bsc-(\d{4,6})\b/gi },
];

const FAKE_TICKET_PATTERNS = [
  /TODO-\d+/i,
  /TICKET-\d+/i,
  /ISSUE-\d+/i,
  /TASK-\d+/i,
  /FIX-\d+/i,
];

export async function analyzeTickets(repoPath = ".", limit = 200) {
  const git = simpleGit(repoPath);
  const raw = await git.raw([
    "log",
    `--max-count=${limit}`,
    "--format=%H|%an|%ad|%s",
    "--date=short",
  ]);

  const commits = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msg] = line.split("|");
      return {
        hash: hash?.trim(),
        author: author?.trim(),
        date: date?.trim(),
        message: msg.join("|").trim(),
      };
    });

  const withTickets = [];
  const withoutTickets = [];
  const fakeTickets = [];
  const ticketCounts = {};
  const authorStats = {};

  for (const c of commits) {
    let foundTicket = false;
    const foundIds = [];

    for (const { name, regex } of TICKET_PATTERNS) {
      const matches = [...c.message.matchAll(regex)];
      if (matches.length > 0) {
        foundTicket = true;
        matches.forEach((m) => {
          const id = m[1];
          foundIds.push({ system: name, id });
          ticketCounts[id] = (ticketCounts[id] || 0) + 1;
        });
      }
    }

    const isFake = FAKE_TICKET_PATTERNS.some((p) => p.test(c.message));
    if (isFake) fakeTickets.push(c);

    if (!authorStats[c.author]) authorStats[c.author] = { withTicket: 0, withoutTicket: 0, fake: 0 };
    if (foundTicket) {
      withTickets.push({ ...c, tickets: foundIds });
      authorStats[c.author].withTicket++;
    } else {
      withoutTickets.push(c);
      authorStats[c.author].withoutTicket++;
    }
    if (isFake) authorStats[c.author].fake++;
  }

  const mostReferenced = Object.entries(ticketCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const ticketRate = commits.length
    ? ((withTickets.length / commits.length) * 100).toFixed(1)
    : 0;

  return {
    commits: commits.length,
    withTickets: withTickets.length,
    withoutTickets: withoutTickets.length,
    fakeTickets: fakeTickets.length,
    ticketRate,
    mostReferenced,
    authorStats,
    noTicketExamples: withoutTickets.slice(0, 5),
    fakeExamples: fakeTickets.slice(0, 3),
  };
}

export async function roastTickets(data) {
  if (data.commits === 0) return null;

  const topShame = Object.entries(data.authorStats)
    .sort((a, b) => b[1].withoutTicket - a[1].withoutTicket)
    .slice(0, 4)
    .map(([a, s]) => `${a}: ${s.withoutTicket} untracked commits, ${s.fake} fake tickets`)
    .join("\n");

  const noTicketExamples = data.noTicketExamples
    .map((c) => `"${c.message}" by ${c.author}`)
    .join("\n");

  const prompt = `You are a savage project manager who lives and dies by ticket tracking.\nUntracked commits are your mortal enemy. Fake ticket IDs are a personal insult.\nRoast this team for their ticket discipline (or lack thereof). Full savage mode.\n\nSTATS:\nTotal commits: ${data.commits}\nCommits WITH ticket references: ${data.withTickets} (${data.ticketRate}%)\nCommits WITHOUT any ticket: ${data.withoutTickets}\nCommits with FAKE ticket IDs: ${data.fakeTickets}\n${
    data.mostReferenced.length
      ? `Most referenced ticket: ${data.mostReferenced[0][0]} (${data.mostReferenced[0][1]}x — is this ticket ever closing?)`
      : ""
  }\n\nExample untracked commits:\n${noTicketExamples}\nAuthor shame:\n${topShame}\n\nFormat:\nHEADLINE: <one savage opener>\nROAST: <3-4 sentences, reference specific numbers and authors>\nFAKE_TICKET_ROAST: <specifically roast anyone making up fake ticket IDs>\nVERDICT: <one line judgment>`;

  const text = await callGemini({ prompt, maxOutputTokens: 600 });
  const ex = (k) =>
    text.match(new RegExp(`${k}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    headline: ex("HEADLINE"),
    roast: ex("ROAST"),
    fakeTicketRoast: ex("FAKE_TICKET_ROAST"),
    verdict: ex("VERDICT"),
    data,
  };
}
