# 🔥 GitBlame Roast

> Let AI roast your git history. Because someone has to.

A CLI tool that analyzes your git commits and uses Claude AI to deliver a brutally funny roast of your worst coding habits — bad commit messages, 3am pushes, massive code dumps, and more.

---

## Installation

```bash
# Clone it
git clone https://github.com/yourusername/gitblame-roast
cd gitblame-roast

# Install dependencies
# If you have npm installed:
npm install

# If your environment doesn't have npm, run the bootstrap script:
./scripts/bootstrap.sh
```

# Set your API key (Google Gemini)

This project is configured to use **Google Gemini** by default via the `GEMINI_API_KEY` environment variable.

### Option A — `.env` (recommended)
Create a `.env` file in the project root (this file is gitignored):

```env
GEMINI_API_KEY=AIzaSyB0ZCenmBiuMduFNuiMdTpqdki7uGwDfN8
```

### Option B — environment variable
```bash
export GEMINI_API_KEY=AIzaSyB0ZCenmBiuMduFNuiMdTpqdki7uGwDfN8
```

> If you also set `ANTHROPIC_API_KEY`, Gemini will still be used unless you explicitly force Anthropic:
> `export ROASTER_PROVIDER=anthropic`

# Run it

```bash
node bin/cli.js
```

**Or install globally:**
```bash
npm install -g .
gitblame-roast
```

---

## Usage

```bash
# Roast your current repo
gitblame-roast

# Roast a specific repo path
gitblame-roast --repo ./my-project

# Roast a specific author
gitblame-roast --author "John Doe"

# Savage mode — absolutely no mercy
gitblame-roast --savage

# Compliment mode (for fragile devs 🌸)
gitblame-roast --compliment

# Analyze more commits
gitblame-roast --limit 500
```

---

## What It Analyzes

| Signal | What we look for |
|--------|-----------------|
| Commit messages | "fix", "wip", "asdf", "ok", "stuff" |
| Commit timing | Late-night (11pm–4am) and weekend pushes |
| Commit size | Massive single commits (50+ files) |
| Repeated messages | How many times you typed "update" |
| Worst single commit | The most embarrassing one |

---

## Example Output

```
📊 Repo Autopsy Report
─────────────────────────────────────────────
  Total commits analyzed:         147
  Late-night commits (11pm–4am):  23
  Weekend commits:                8
  Meaningless commit messages:    31

  Most repeated messages:
    "fix" ×14
    "update" ×9
    "wip" ×5

╔══════════════════════════════════════════╗
║           🔥 THE ROAST 🔥               ║
║                                          ║
║  Welcome, John — the Kafka of codebases. ║
║                                          ║
║  You have committed the word "fix" 14    ║
║  times. Fix WHAT, John? Everything?      ║
║  Nothing? Both? Your biggest commit had  ║
║  94 files changed. That's not a commit,  ║
║  that's a hostage situation.             ║
║                                          ║
║  ────────────────────────────────────── ║
║  💀 Worst Commit Award:                 ║
║  "stuff" at 2:47am on a Tuesday.         ║
║  What stuff, John. WHAT STUFF.           ║
║                                          ║
║  🏆 Your Developer Title:               ║
║  "The Midnight Caffeinated Chaos Agent"  ║
║                                          ║
║  Commit messages exist for a reason.     ║
║  That reason is so future-you doesn't   ║
║  cry. Consider it.                       ║
╚══════════════════════════════════════════╝

  Roast Level: 🔴 EXTRA CRISPY
```

---

## Project Structure

```
gitblame-roast/
├── bin/
│   └── cli.js                  # Entry point
├── src/
│   ├── analyzers/
│   │   └── gitAnalyzer.js      # Parses git log into stats
│   ├── roast/
│   │   └── aiRoaster.js        # Calls Claude API to roast
│   ├── utils/
│   │   └── renderer.js         # Terminal display / formatting
│   └── commands/
│       └── roast.js            # Main command orchestrator
├── package.json
└── README.md
```

---

## Roadmap

- [ ] `--share` flag: Generate a shareable PNG card
- [ ] `--team` flag: Roast all authors, generate a leaderboard
- [ ] GitHub Action: Auto-roast every PR as a bot comment
- [ ] Detect TODO comments older than 1 year
- [ ] Detect copy-pasted code blocks across files
- [ ] `--export` flag: Save roast as Markdown file

---

## Contributing

PRs welcome! Especially:
- New roast templates
- New git signal detectors
- Language support

---

## License

MIT — roast responsibly.
