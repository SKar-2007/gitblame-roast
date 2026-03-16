import fs from "fs";
import path from "path";

/**
 * Default config — every key can be overridden by .roastrc.json
 */
export const DEFAULT_CONFIG = {
  // General
  repo:          ".",
  limit:         200,
  savage:        false,
  compliment:    false,
  outputDir:     "./output",

  // Filtering
  author:        null,
  ignoreAuthors: [],        // e.g. ["dependabot[bot]", "github-actions"]
  ignoreBranches: ["HEAD", "main", "master", "develop"],
  ignoreFiles:   ["package-lock.json", "yarn.lock", "*.min.js"],

  // Shame thresholds (tune to your team)
  thresholds: {
    lateHourStart:     22,  // commits after this hour are "late"
    lateHourEnd:       4,   // commits before this hour are "late"
    lazyMessageMaxLen: 10,  // messages shorter than this are "lazy"
    bigCommitFiles:    50,  // commits touching more than this are "big dumps"
    oldTodoDays:       30,  // TODOs older than this get flagged
    shameStreakDays:   3,   // streak this long triggers a streak roast
  },

  // Custom lazy commit patterns (merged with built-ins)
  customLazyPatterns: [],   // e.g. ["wip", "tmp", "blah"]

  // Feature toggles
  features: {
    heatmap:     true,
    streak:      true,
    badge:       true,
    personality: true,
    tickets:     true,
  },

  // Badge
  badge: {
    style:   "for-the-badge",  // shields.io style
    repoUrl: null,             // auto-detected if null
  },

  // Email
  email: {
    teamName: "The Team",
    repoName: null,            // auto-detected
  },

  // PDF report
  pdf: {
    includeTodos:    true,
    includeBranches: true,
    includeHeatmap:  true,
    pageSize:        "A4",
  },
};

/**
 * Loads .roastrc.json from the repo root (or current dir).
 * Performs deep merge with defaults.
 * Returns the merged config.
 */
export function loadConfig(repoPath = ".") {
  const candidates = [
    path.resolve(repoPath, ".roastrc.json"),
    path.resolve(repoPath, ".roastrc"),
    path.resolve(process.cwd(), ".roastrc.json"),
    path.resolve(process.cwd(), ".roastrc"),
  ];

  let userConfig = {};
  let foundAt    = null;

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, "utf-8");
      userConfig = JSON.parse(raw);
      foundAt    = candidate;
      break;
    } catch {}
  }

  const merged = deepMerge(DEFAULT_CONFIG, userConfig);

  return { config: merged, foundAt };
}

/**
 * Merges CLI options (highest priority) on top of loaded config.
 * CLI flags always win over .roastrc.json.
 */
export function mergeWithCLI(config, cliOptions = {}) {
  const result = { ...config };

  // Direct overrides from CLI flags
  if (cliOptions.repo)      result.repo      = cliOptions.repo;
  if (cliOptions.author)    result.author     = cliOptions.author;
  if (cliOptions.limit)     result.limit      = parseInt(cliOptions.limit);
  if (cliOptions.savage)    result.savage     = true;
  if (cliOptions.compliment)result.compliment  = true;

  return result;
}

/**
 * Writes a starter .roastrc.json to the current directory.
 */
export function initConfig(targetDir = ".") {
  const outputPath = path.resolve(targetDir, ".roastrc.json");

  if (fs.existsSync(outputPath)) {
    return { path: outputPath, created: false };
  }

  const starterConfig = {
    "_comment": "GitBlame Roast config — all fields are optional, defaults are shown",
    "limit":          200,
    "savage":         false,
    "outputDir":      "./output",
    "ignoreAuthors":  ["dependabot[bot]"],
    "ignoreBranches": ["HEAD", "main", "master", "develop"],
    "thresholds": {
      "lateHourStart":     22,
      "lateHourEnd":       4,
      "lazyMessageMaxLen": 10,
      "bigCommitFiles":    50,
      "oldTodoDays":       30,
      "shameStreakDays":   3
    },
    "customLazyPatterns": [],
    "features": {
      "heatmap":     true,
      "streak":      true,
      "badge":       true,
      "personality": true,
      "tickets":     true
    },
    "email": {
      "teamName": "The Team",
      "repoName": null
    },
    "pdf": {
      "includeTodos":    true,
      "includeBranches": true,
      "includeHeatmap":  true
    }
  };

  fs.writeFileSync(outputPath, JSON.stringify(starterConfig, null, 2));
  return { path: outputPath, created: true };
}

/**
 * Validates a config object — returns array of warnings.
 */
export function validateConfig(config) {
  const warnings = [];

  const t = config.thresholds ?? {};
  if (t.lateHourStart < 18) warnings.push("thresholds.lateHourStart is very early — most commits before 6pm won't be flagged as late.");
  if (t.bigCommitFiles < 10) warnings.push("thresholds.bigCommitFiles is very low — many normal commits will be flagged.");
  if (t.oldTodoDays < 7)    warnings.push("thresholds.oldTodoDays is very low — most TODOs will be flagged.");

  return warnings;
}

// ── Deep merge utility ─────────────────────────────────────────────────────

function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (val && typeof val === "object" && !Array.isArray(val) &&
        base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
