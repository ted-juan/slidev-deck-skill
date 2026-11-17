# slidev-deck

An [Agent Skill](https://agentskills.io) that teaches an AI coding agent to turn a slide draft into a polished [Slidev](https://sli.dev) web deck with a downloadable PDF, publish it to GitHub Pages or Netlify, and avoid the deployment traps that cause blank pages or broken images.

**Live example:** <https://ted-juan.github.io/six-grand-endless-wonders/> ([source](https://github.com/ted-juan/six-grand-endless-wonders))

## Table of contents

- [What it covers](#what-it-covers)
- [What's here](#whats-here)
- [Install](#install)
- [Usage](#usage)
  - [AI images by agent](#ai-images-by-agent)
- [Traps it prevents](#traps-it-prevents)
- [Known limitations](#known-limitations)
- [Credits](#credits)

## What it covers

| Area | What the skill does |
|---|---|
| Scaffold | Sets up pnpm + Slidev + `seriph` theme, with Playwright allowed to install so PDF export works |
| Scaffold (deck) | Starts from a `slides.md` template: cover, two-column content, single photo, closing slide with QR |
| Pictures | Makes an image plan for **every** slide that needs a visual: free-licence Wikimedia Commons photos for real subjects (credit line + `image-credits.json`), agent-drawn diagrams and charts for processes and numbers, AI images for abstract ideas (asks first). See [AI images by agent](#ai-images-by-agent) |
| Authoring | Uses a two-column layout, `<Pic>` photo cards, and a `<Credit>` attribution line for Wikimedia Commons photos |
| Base path | Sends every `/...` image through `asset()` / `$asset()` so the deck still works under `/<repo>/` |
| Advanced features | Applies slide transitions, one-by-one reveals (`v-clicks`), hand-drawn emphasis on key numbers (`v-mark`), and a QR code to the live deck. Speaker notes are proposed but only written from the speaker's own words |
| Journey map | Optional animated Taiwan itinerary map that moves one leg per click |
| Publish | GitHub Pages workflow (correct `--base`, PDF export, SPA `404.html`), or Netlify CLI |
| Verify | Checks the live site with `curl` instead of trusting a green Actions run |
| Content rule | **The presenter's content comes first**: it changes layout, visuals, and pacing only, never facts, wording, or slide order |

## What's here

| Path | Purpose |
|---|---|
| `SKILL.md` | Instructions the agent reads (workflow, conventions, trap list) |
| `scripts/find-image.mjs` | Picture finder: Wikimedia Commons search + download, or AI generation; prints a ready `<Credit>` line. Node ≥ 18, no dependencies |
| `templates/base/` | Project skeleton: `slides.md`, `package.json`, `pnpm-workspace.yaml`, `gitignore`, `setup/`, `components/Pic.vue`, `components/Credit.vue`, `.github/workflows/deploy.yml` |
| `templates/journey-map/` | Optional: `JourneyMap.vue`, pre-projected Taiwan basemap (`taiwan-map.json`, ~840 KB), sample `journeys.example.ts` |

## Install

Clone the repo into the skills folder your agent reads. The folder must be named `slidev-deck`, with `SKILL.md` directly inside it.

**Claude Code** (all projects):

```bash
git clone https://github.com/ted-juan/slidev-deck-skill.git ~/.claude/skills/slidev-deck
```

**One project only** (Google Antigravity, GitHub Copilot in VS Code, OpenAI Codex, Gemini CLI): run this from the project root.

```bash
git clone https://github.com/ted-juan/slidev-deck-skill.git .agents/skills/slidev-deck
rm -rf .agents/skills/slidev-deck/.git   # commit it as plain files, not a submodule
```

| Agent | Project folder | Personal / global folder |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| GitHub Copilot (VS Code) | `.agents/skills/`, `.github/skills/`, `.claude/skills/` | `~/.copilot/skills/` |
| Google Antigravity | `.agents/skills/` | `~/.gemini/config/skills/` |
| Gemini CLI (experimental, enable in settings) | `.agents/skills/`, `.gemini/skills/` | `~/.gemini/skills/` |
| OpenAI Codex | `.agents/skills/` | — |

Folder names change between agent versions. If a skill isn't detected, check that agent's current docs.

To update a global install:

```bash
git -C ~/.claude/skills/slidev-deck pull
```

## Usage

Just ask in plain language. The agent loads the skill when the request matches, for example:

- "Turn `draft.md` into a Slidev deck with photos and a PDF download."
- "Add pictures to every slide that needs one."
- "Deploy these slides to GitHub Pages."
- "My GitHub Pages deck shows a blank page. Find out why."
- "Fix my teammate's deck deployment without changing their slides."

In Claude Code you can also run it directly with `/slidev-deck`.

### AI images by agent

| Agent | Can it make AI images by itself? | What the skill does |
|---|---|---|
| Claude Code | No (it can draw SVG diagrams and icons) | Uses `find-image.mjs --source ai` with `OPENAI_API_KEY` or `GEMINI_API_KEY`, else SVG |
| Gemini Code Assist (VS Code) | No built-in image tool | Same as Claude Code |
| Gemini CLI | Yes, with the `nanobanana` extension | Uses the extension's `generate_image` tool |
| Google Antigravity | Yes, built-in Nano Banana | Uses its own image generation |

Real places, people and events always get a real photo, never an AI image.

## Traps it prevents

| Symptom | Cause |
|---|---|
| Live page is blank but Actions shows green | `pnpm build -- --base /repo/`: pnpm passes the `--` through, so Slidev ignores `--base` |
| Photos are broken after deploy | `<img src="/x.jpg">` points at the domain root instead of `/repo/` |
| Opening or refreshing `/2` gives a 404 | GitHub Pages has no SPA rewrite, so no `404.html` fallback |
| Build job passes, deploy job fails | Pages Source is not set to **GitHub Actions** in repo Settings |
| PDF export can't find a browser | pnpm blocked Playwright's postinstall script |

`SKILL.md` lists the full cause and fix for each.

## Known limitations

- The journey-map basemap covers **Taiwan only**. Other regions need their own pre-projected map JSON.
- GitHub Pages returns HTTP 404 for direct slide URLs (`/2`), even though the page renders correctly. Search engines may not index individual slides.
- Template versions are pinned to what was tested (Slidev 52.x, `seriph` 0.25). Newer Slidev releases may need small changes.
- Wikimedia Commons has few photos of small or very local places. Try the local-language name, or use your own photo.
- AI images need your own `OPENAI_API_KEY` or `GEMINI_API_KEY`, and each image costs money. Default model names (`gpt-image-2`, `gemini-2.5-flash-image`) change over time; override with `SLIDEV_IMAGE_MODEL`.
- Enabling GitHub Pages is a one-time manual step in repo Settings. The agent cannot do it.

## Credits

- Built on [Slidev](https://sli.dev) and the `seriph` theme.
- Photos come from [Wikimedia Commons](https://commons.wikimedia.org); each keeps its own author and licence.
- Taiwan township outlines are derived from [taiwan-atlas](https://github.com/dkaoster/taiwan-atlas) (MIT), with data from Taiwan's Ministry of the Interior.
