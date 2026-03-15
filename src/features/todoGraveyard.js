import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { callGemini } from "../roast/geminiClient.js";

const TODO_PATTERN = /\/\/\s*(TODO|FIXME|HACK|XXX|BUG|NOTE)[\s:]*(.*)/gi;

/**
 * Scans repo for TODO/FIXME comments and finds their age via git blame.
 */
export async function analyzeTodoGraveyard(repoPath = ".") {
  const todos = [];

  const files = getAllSourceFiles(repoPath);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8").split("\n");
    content.forEach((line, idx) => {
      const match = TODO_PATTERN.exec(line);
      TODO_PATTERN.lastIndex = 0;
      if (match) {
        const lineNum = idx + 1;
        const age = getLineAge(repoPath, file, lineNum);
        todos.push({
          file: path.relative(repoPath, file),
          line: lineNum,
          type: match[1].toUpperCase(),
          message: match[2].trim() || "(no description, classic)",
          age,
          ageLabel: formatAge(age),
        });
      }
    });
  }

  todos.sort((a, b) => b.age - a.age);
  return todos;
}

/** Get age of a specific line in days via git blame */
function getLineAge(repoPath, file, lineNum) {
  try {
    const result = execSync(
      `git -C "${repoPath}" blame -L ${lineNum},${lineNum} --porcelain "${file}"`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    const match = result.match(/^author-time (\d+)/m);
    if (match) {
      const commitTime = parseInt(match[1]) * 1000;
      return Math.floor((Date.now() - commitTime) / (1000 * 60 * 60 * 24));
    }
  } catch {
    // Untracked file or blame failure
  }
  return 0;
}

/** Get all source code files recursively */
function getAllSourceFiles(dir) {
  const EXTENSIONS = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".go",
    ".java",
    ".cs",
    ".cpp",
    ".rb",
  ];
  const IGNORE_DIRS = [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "vendor",
  ];
  const results = [];

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (EXTENSIONS.includes(path.extname(entry.name))) results.push(full);
    }
  }

  walk(dir);
  return results;
}

function formatAge(days) {
  if (days >= 365) return `${Math.floor(days / 365)} year(s)`;
  if (days >= 30) return `${Math.floor(days / 30)} month(s)`;
  return `${days} day(s)`;
}

/** Generate a savage AI roast of the TODO graveyard */
export async function roastTodos(todos) {
  if (todos.length === 0) return null;

  const oldest = todos.slice(0, 5);
  const summary = oldest
    .map(
      (t) =>
        `[${t.type}] "${t.message}" in ${t.file}:${t.line} — ${t.ageLabel} old`
    )
    .join("\n");

  const prompt = `You are a savage developer comedian with ZERO mercy.\nRoast these ancient TODO comments left rotting in a codebase. Be brutal, specific, funny.\nEach TODO is a broken promise. Treat them like crime scene evidence.\n\nTODO GRAVEYARD:\n${summary}\n\nTotal TODOs found: ${todos.length}\n\nRespond in this exact format:\nHEADLINE: <one devastating opener>\nEULOGY: <3-4 sentences roasting the worst offenders specifically>\nVERDICT: <one brutal closing judgment>`;

  const text = await callGemini({ prompt, maxOutputTokens: 700 });

  const extract = (key) =>
    text.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    headline: extract("HEADLINE"),
    eulogy: extract("EULOGY"),
    verdict: extract("VERDICT"),
    todos,
  };
}
