import simpleGit from "simple-git";

/**
 * Fetches and structures raw git data for roasting.
 * @param {string} repoPath - path to the git repo
 * @param {object} options - { author, limit }
 * @returns {object} structured git stats
 */
export async function analyzeRepo(repoPath = ".", options = {}) {
  const git = simpleGit(repoPath);
  const { author, limit = 100 } = options;

  const logOptions = [
    `--max-count=${limit}`,
    "--stat",           // include file change stats
    "--format=%H|%an|%ae|%ad|%s", // hash|author|email|date|subject
  ];
  if (author) logOptions.push(`--author=${author}`);

  const rawLog = await git.raw(["log", ...logOptions]);
  const commits = parseLog(rawLog);

  return {
    commits,
    stats: buildStats(commits),
    repoPath,
  };
}

/** Parse the raw git log output into structured objects */
function parseLog(rawLog) {
  const lines = rawLog.trim().split("\n");
  const commits = [];
  let current = null;

  for (const line of lines) {
    // Commit header line: hash|author|email|date|subject
    if (line.includes("|") && line.match(/^[a-f0-9]{40}/)) {
      if (current) commits.push(current);
      const [hash, author, email, date, ...subjectParts] = line.split("|");
      current = {
        hash: hash.trim(),
        author: author.trim(),
        email: email.trim(),
        date: new Date(date.trim()),
        message: subjectParts.join("|").trim(),
        filesChanged: 0,
        insertions: 0,
        deletions: 0,
      };
    }

    // Stat summary line: "3 files changed, 47 insertions(+), 2 deletions(-)"
    if (current && line.includes("files changed")) {
      const filesMatch = line.match(/(\d+) files? changed/);
      const insertMatch = line.match(/(\d+) insertion/);
      const deleteMatch = line.match(/(\d+) deletion/);
      if (filesMatch) current.filesChanged = parseInt(filesMatch[1]);
      if (insertMatch) current.insertions = parseInt(insertMatch[1]);
      if (deleteMatch) current.deletions = parseInt(deleteMatch[1]);
    }
  }
  if (current) commits.push(current);
  return commits;
}

/** Build aggregate stats from all commits */
function buildStats(commits) {
  const messageCounts = {};
  const authorStats = {};
  let lateNightCommits = 0;
  let weekendCommits = 0;
  let biggestCommit = null;
  let lazyMessages = [];

  const LAZY_PATTERNS = [
    /^fix$/i, /^fixed$/i, /^fixes$/i,
    /^wip$/i, /^work in progress/i,
    /^update$/i, /^updates$/i,
    /^asdf/i, /^test$/i, /^temp$/i,
    /^ok$/i, /^done$/i, /^idk/i,
    /^stuff$/i, /^things$/i, /^changes$/i,
    /^commit$/i, /^\./,
  ];

  for (const commit of commits) {
    // Author tracking
    if (!authorStats[commit.author]) {
      authorStats[commit.author] = { commits: 0, lateNight: 0, lazy: 0, bigDumps: 0 };
    }
    authorStats[commit.author].commits++;

    // Late night commits (11pm - 4am)
    const hour = commit.date.getHours();
    if (hour >= 23 || hour <= 4) {
      lateNightCommits++;
      authorStats[commit.author].lateNight++;
    }

    // Weekend commits
    const day = commit.date.getDay();
    if (day === 0 || day === 6) weekendCommits++;

    // Lazy commit messages
    const isLazy = LAZY_PATTERNS.some((p) => p.test(commit.message.trim()));
    if (isLazy) {
      lazyMessages.push(commit);
      authorStats[commit.author].lazy++;
    }

    // Biggest single commit
    if (!biggestCommit || commit.filesChanged > biggestCommit.filesChanged) {
      biggestCommit = commit;
    }

    // Big dump detection (50+ files in one commit)
    if (commit.filesChanged >= 50) {
      authorStats[commit.author].bigDumps++;
    }

    // Message frequency
    const key = commit.message.toLowerCase().trim();
    messageCounts[key] = (messageCounts[key] || 0) + 1;
  }

  // Top repeated messages
  const repeatedMessages = Object.entries(messageCounts)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalCommits: commits.length,
    lateNightCommits,
    weekendCommits,
    lazyMessages: lazyMessages.slice(0, 10),
    biggestCommit,
    repeatedMessages,
    authorStats,
    uniqueAuthors: Object.keys(authorStats),
  };
}
