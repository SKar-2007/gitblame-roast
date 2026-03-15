import { callGemini } from "../../roast/geminiClient.js";

const ARCHETYPES = [
  {
    id: "midnight_cowboy",
    name: "The 3AM Cowboy",
    emoji: "🤠",
    description: "Rides alone. Commits at ungodly hours. No one knows if they sleep.",
    check: (s) => s.lateNightCommits > s.totalCommits * 0.25,
  },
  {
    id: "wip_artist",
    name: "The Eternal WIP Artist",
    emoji: "🎨",
    description: "Everything is a work in progress. Nothing is ever done. The WIP is the destination.",
    check: (s) => (s.lazyMessages?.length ?? 0) > s.totalCommits * 0.3,
  },
  {
    id: "code_bomber",
    name: "The Code Bomber",
    emoji: "💣",
    description: "Sits in silence for days, then drops 200 file changes with the message 'stuff'.",
    check: (s) => (s.biggestCommit?.filesChanged ?? 0) > 80,
  },
  {
    id: "friday_gremlin",
    name: "The Friday Gremlin",
    emoji: "😈",
    description: "Specifically waits until Friday 5pm to push breaking changes, then disappears for the weekend.",
    check: (s) => s.weekendCommits > s.totalCommits * 0.15,
  },
  {
    id: "ghost_committer",
    name: "The Ghost Committer",
    emoji: "👻",
    description: "Commits everything as 'fix'. No context. No explanation. Just vibes and terror.",
    check: (s) => (s.lazyMessages?.length ?? 0) > s.totalCommits * 0.5,
  },
  {
    id: "chaos_agent",
    name: "The Chaos Agent",
    emoji: "🌪️",
    description: "No pattern. No schedule. No mercy. Commits at all hours, every day, messages make no sense.",
    check: (s) =>
      s.lateNightCommits > 10 && s.weekendCommits > 5 && (s.lazyMessages?.length ?? 0) > 10,
  },
  {
    id: "good_student",
    name: "The Suspiciously Good Student",
    emoji: "🌸",
    description: "Clean commits. Descriptive messages. Commits during business hours. Deeply suspicious.",
    check: (s) => s.lateNightCommits < 3 && (s.lazyMessages?.length ?? 0) < 5,
  },
];

export async function analyzePersonality(stats, author) {
  const s = stats.stats;

  const matched = ARCHETYPES.filter((a) => a.check(s));
  const primary = matched[0] ?? ARCHETYPES[5];
  const secondary = matched[1] ?? null;

  const prompt = `You are a savage developer psychologist creating a developer personality profile card.\nBased on these git stats, create a full personality profile. Be funny, brutal, and specific.\n\nSTATS:\nAuthor: ${author || "Anonymous Dev"}\nTotal commits: ${s.totalCommits}\nLate-night commits: ${s.lateNightCommits}\nWeekend commits: ${s.weekendCommits}\nLazy messages: ${s.lazyMessages?.length ?? 0}\nBiggest commit: ${s.biggestCommit?.filesChanged ?? 0} files\nPrimary archetype detected: ${primary.name} — ${primary.description}\n${
    secondary ? `Secondary archetype: ${secondary.name}` : ""
  }\n\nCreate a developer personality card. Format EXACTLY:\nTYPE: <personality type name, 3-5 words, creative>\nEMOJI: <2-3 emojis that represent them>\nTAGLINE: <one devastating one-liner>\nTRAITS: <3 bullet traits, each one sentence, separated by |>\nSUPERPOWER: <their unexpected strength, 1 sentence>\nFATAL_FLAW: <their defining weakness, 1 sentence>\nSPIRIT_ANIMAL: <a specific animal and why, 1 sentence>\nCOMPATIBILITY: <what kind of developer they work best/worst with, 1 sentence>`;

  const text = await callGemini({ prompt, maxOutputTokens: 700 });
  const ex = (k) =>
    text.match(new RegExp(`${k}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, "s"))?.[1]?.trim() ?? "";

  return {
    archetype: primary,
    secondaryArchetype: secondary,
    type: ex("TYPE"),
    emoji: ex("EMOJI"),
    tagline: ex("TAGLINE"),
    traits: ex("TRAITS").split("|").map((s) => s.trim()).filter(Boolean),
    superpower: ex("SUPERPOWER"),
    fatalFlaw: ex("FATAL_FLAW"),
    spiritAnimal: ex("SPIRIT_ANIMAL"),
    compatibility: ex("COMPATIBILITY"),
    author: author || "Anonymous Dev",
  };
}
