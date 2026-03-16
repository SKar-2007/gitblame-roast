# 🔥 GitBlame Roast

> Let AI roast your git history. Because someone has to.

A CLI tool that analyzes your git commits and uses Google Gemini to deliver a brutally funny roast of your worst coding habits — bad commit messages, 3am pushes, massive code dumps, and more.

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

This project is configured to use **Google Gemini** via the `GEMINI_API_KEY` environment variable.

### Option A — `.env` (recommended)
Create a `.env` file in the project root (this file is gitignored):

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Option B — environment variable
```bash
export GEMINI_API_KEY=your_gemini_api_key_here
```

# Run it

```bash
node bin/cli.js
```

**Or install globally:**
```bash
npm install -g .
gitblame-roast
```

## GitHub Actions (CI)

This repo includes a GitHub Actions workflow that runs a short roast on every push and pull request.

### Setup
1. Add your Gemini API key to the repo secrets:
   - `Settings → Secrets and variables → Actions → New repository secret`
   - Name: `GEMINI_API_KEY`
   - Value: your Gemini API key

2. The workflow will run automatically on push/pr.

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

# Generate a shareable PNG card
# (optional output path, default: roast.png)
gitblame-roast --share

# Save JSON output (use in CI)
gitblame-roast --json-output roast.json

# Roast TODOs found in repo
gitblame-roast todos

# Roast branch names
gitblame-roast branches

# Roast team members based on commit stats
gitblame-roast team

# Roast reverts + panic commits
gitblame-roast reverts

# View your commit heatmap
gitblame-roast heatmap

# Roast PR merge descriptions
gitblame-roast prs

# Detect missing ticket IDs in commits
gitblame-roast tickets

# Track your shame streak
gitblame-roast streak

# Replay roast score over time
gitblame-roast replay

# Get a developer personality roast
gitblame-roast personality

# Generate a weekly digest email
gitblame-roast email

# Interactive dashboard
gitblame-roast dashboard

# Generate a README badge with your roast score
gitblame-roast badge

# Generate a monthly PDF report
# Requires ANTHROPIC_API_KEY in env (Anthropic Claude/Claude 3)
gitblame-roast report

# Use config file
# Creates a starter .roastrc.json (then edit to adjust settings)
gitblame-roast config init

# Inspect current config
gitblame-roast config show

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
║           🔥 THE ROAST 🔥                ║
║                                          ║
║  Welcome, John — the Kafka of codebases. ║
║                                          ║
║  You have committed the word "fix" 14    ║
║  times. Fix WHAT, John? Everything?      ║
║  Nothing? Both? Your biggest commit had  ║
║  94 files changed. That's not a commit,  ║
║  that's a hostage situation.             ║
║                                          ║
║  ──────────────────────────────────────  ║
║  💀 Worst Commit Award:                  ║
║  "stuff" at 2:47am on a Tuesday.         ║
║  What stuff, John. WHAT STUFF.           ║
║                                          ║
║  🏆 Your Developer Title:                ║
║  "The Midnight Caffeinated Chaos Agent"  ║
║                                          ║
║  Commit messages exist for a reason.     ║
║  That reason is so future-you doesn't    ║
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
│   │   ├── aiRoaster.js        # Calls Gemini API to roast
│   │   └── geminiClient.js     # Shared Gemini HTTP client
│   ├── features/
│   │   ├── branchRoaster.js      # Branch name analysis + roast
│   │   ├── todoGraveyard.js      # TODO scanner + roast
│   │   ├── teamLeaderboard.js    # Team roast leaderboard
│   │   ├── heatmap/commitHeatmap.js # Commit heatmap generator + renderer
│   │   ├── badge/roastBadge.js   # README badge generator
│   │   ├── personality/personality.js # Developer personality analyzer
│   │   ├── pr/prAnalyzer.js      # PR merge description analyzer + roast
│   │   ├── replay/replay.js      # Roast score replay timeline
│   │   ├── streak/roastStreak.js # Shame streak analyzer + roast
│   │   ├── tickets/ticketDetector.js # Ticket ID detector + roast
│   │   ├── email/weeklyEmail.js  # Generate weekly digest email
│   │   └── dashboard/dashboard.js # Interactive CLI dashboard
│   ├── commands/
│   │   ├── roast.js              # Main roast command
│   │   ├── todos.js              # TODO roast command
│   │   ├── branches.js           # Branch roast command
│   │   ├── team.js               # Team leaderboard command
│   │   ├── reverts.js            # Revert roast command
│   │   ├── heatmap.js            # Commit heatmap command
│   │   ├── badge.js              # Roast badge command
│   │   ├── personality.js         # Developer personality command
│   │   ├── prs.js                # PR merge description command
│   │   ├── tickets.js            # Ticket detector command
│   │   ├── replay.js             # Roast replay command
│   │   ├── streak.js             # Shame streak command
│   │   ├── email.js              # Weekly email command
│   │   └── dashboard.js          # Interactive dashboard command
│   └── utils/
│       └── renderer.js         # Terminal output formatting
├── package.json
└── README.md
```

---

## Roadmap

- [x] `--share` flag: Generate a shareable PNG card
- [x] `--team` flag: Roast all authors, generate a leaderboard
- [x] `todos` command: Roast TODO comments found in repo
- [x] `branches` command: Roast shameful branch names
- [x] `reverts` command: Roast your revert + panic commit history
- [x] `heatmap` command: Show commit heatmap (shame calendar)
- [x] `badge` command: Generate a README roast score badge
- [x] `--json-output` flag: Emit machine-readable roast JSON
- [ ] GitHub Action: Auto-roast every PR as a bot comment
- [ ] `--export` flag: Save roast as Markdown file
- [ ] Detect copy-pasted code blocks across files

---

## Contributing

PRs welcome! Especially:
- New roast templates
- New git signal detectors
- Language support

---

## License

MIT — roast responsibly.
