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
| Wording check | `check-wording.mjs` proves every sentence of the draft is still in the deck, in order, and lists every word the deck added |
| Auto layout | `fit-slides.mjs` keeps one font size across the deck and shrinks only a slide that overflows (never below 0.85; else split it). Half-empty slides get a small picture or a diagram from their own words, or stay white |
| Layout check | `check-overflow.mjs` measures every slide in a real browser and names the element that runs off the edge; then a PNG look for what can't be measured |
| Editable PPTX | `slidev export --format pptx-editable` for colleagues who edit in PowerPoint (real text boxes, not pictures) |
| Verify | Checks the live site with `curl` instead of trusting a green Actions run |
| Content rule | **The presenter's content comes first**: it changes layout, visuals, and pacing only, never facts, wording, or slide order |

## What's here

| Path | Purpose |
|---|---|
| `SKILL.md` | Instructions the agent reads (workflow, conventions, trap list) |
| `scripts/check-wording.mjs` | Draft vs deck: missing, reordered and added text. Node ≥ 18, no dependencies |
| `scripts/fit-slides.mjs` | One font size for the deck: shrinks only overflowing slides (min 0.85), lists slides to split; no zoom on `v-mark` slides |
| `scripts/check-overflow.mjs` | Finds slides whose content runs off the edge, using the deck's own Slidev + Playwright |
| `scripts/find-image.mjs` | Picture finder: Wikimedia Commons search + download, or AI generation; prints a ready `<Credit>` line. Node ≥ 18, no dependencies |
| `templates/base/` | Project skeleton: `slides.md`, `style.css`, `package.json`, `pnpm-workspace.yaml`, `gitignore`, `setup/`, `components/Pic.vue`, `components/Credit.vue`, `.github/workflows/deploy.yml` |
| `templates/journey-map/` | Optional: `JourneyMap.vue`, pre-projected Taiwan basemap (`taiwan-map.json`, ~840 KB), sample `journeys.example.ts` |

## Install

| Step | What | Needed? |
|---|---|---|
| 1 | Node.js ≥ 18 and pnpm | Required |
| 2 | This skill (`slidev-deck`) | Required |
| 3 | Official Slidev skill (`slidev`) | Recommended |
| 4 | Check that the agent sees both | — |

Slidev itself is **not** installed here: each new deck runs `pnpm install` and gets Slidev, the theme and Playwright from npm.

### Step 1: Node.js and pnpm

```bash
node -v                 # 18 or newer
npm install -g pnpm     # if `pnpm -v` fails; `corepack enable pnpm` breaks on older corepack
```

### Step 2: this skill

**Claude Code** (all projects):

```bash
git clone https://github.com/ted-juan/slidev-deck-skill.git ~/.claude/skills/slidev-deck
```

**One project only** (Google Antigravity, GitHub Copilot in VS Code, OpenAI Codex, Gemini CLI): run this from the project root.

```bash
git clone https://github.com/ted-juan/slidev-deck-skill.git .agents/skills/slidev-deck
rm -rf .agents/skills/slidev-deck/.git   # commit it as plain files, not a submodule
```

The folder must be named `slidev-deck`, with `SKILL.md` directly inside it.

| Agent | Project folder | Personal / global folder |
|---|---|---|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| GitHub Copilot (VS Code) | `.agents/skills/`, `.github/skills/`, `.claude/skills/` | `~/.copilot/skills/` |
| Google Antigravity | `.agents/skills/` | `~/.gemini/config/skills/` |
| Gemini CLI (experimental, enable in settings) | `.agents/skills/`, `.gemini/skills/` | `~/.gemini/skills/` |
| OpenAI Codex | `.agents/skills/` | — |

Folder names change between agent versions. If a skill isn't detected, check that agent's current docs.

### Step 3: official Slidev skill (recommended)

Skills don't install each other, so add it yourself. It is the **syntax reference** (layouts, components, animations, export flags) and tracks each Slidev release; this skill keeps the **workflow** (content rule, pictures, layout checks, publishing). Without it everything still works, but the agent writes Slidev syntax from memory.

```bash
git clone -q --depth 1 --filter=blob:none --sparse https://github.com/slidevjs/slidev.git /tmp/slidev-src
git -C /tmp/slidev-src sparse-checkout set skills/slidev
cp -r /tmp/slidev-src/skills/slidev ~/.claude/skills/slidev   # or <project>/.agents/skills/slidev
rm -rf /tmp/slidev-src
```

### Step 4: check

```bash
ls ~/.claude/skills/slidev-deck/SKILL.md ~/.claude/skills/slidev/SKILL.md
```

Start a new agent session; in Claude Code, `/slidev-deck` and `/slidev` should both be listed.

### Update

```bash
git -C ~/.claude/skills/slidev-deck pull
# official skill: repeat step 3 (rm -rf ~/.claude/skills/slidev first)
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
| Tables or diagrams cut off at the slide edge | seriph's tall table rows; wide Mermaid charts in a narrow column or on a zoomed slide |
| Hand-drawn marks in the wrong place in the PDF | `v-mark` on a zoomed slide |
| Highlighted words hidden under solid yellow | Opaque highlight colour; use `#facc1559` (with alpha) |
| Netlify site shows a login page (401) | Account requires Netlify team login for every site |
| `pnpm` fails after `corepack enable pnpm` | Older corepack can't run pnpm ≥ 11 |

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
