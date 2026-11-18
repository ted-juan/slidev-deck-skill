---
name: slidev-deck
description: Build, polish, and publish a presentation as a Slidev web deck (Markdown → website + downloadable PDF), deployed to GitHub Pages or Netlify, plus an editable PowerPoint (pptx-editable) for people who edit in PowerPoint. Covers the project skeleton and a starter slides.md (pnpm, seriph theme, playwright PDF export), an automatic image plan for every slide that needs a visual (free-licence Wikimedia Commons photos with credit lines, agent-drawn diagrams/charts, or AI-generated images via the agent's own image tool or OpenAI/Gemini when asked), reusable components (Pic photo card, Credit attribution, optional animated Taiwan JourneyMap with a walking traveller, scene zoom-ins and per-stop effects), creative micro-animations invented per slide from its own subject (count-up numbers, typed subtitles, sky lanterns / steam / petals / coins drifting, Ken Burns photos, custom SVG+CSS animations), advanced Slidev features applied without touching the talk's wording (transitions, v-clicks reveals, v-mark emphasis, QR code; speaker notes only with the speaker's input), the base-path asset() helper that keeps images working under /<repo>/, a GitHub Pages workflow that actually honours --base, and scripts that prove no word of the talk changed (check-wording) and no slide overflows (check-overflow), and the traps that produced blank pages / broken images / 404 on /2. Also covers fixing someone else's deployed deck without touching their speaking content. Use when the user asks to make/beautify slides or a presentation (簡報/投影片), turn a Markdown or text draft into a deck, publish slides to GitHub Pages or Netlify, or find or generate pictures, diagrams or charts for slides, or debug a Slidev deck that shows a blank page or missing images once deployed.
---

# Slidev deck: build → polish → publish

Reference deck this was distilled from: repo
https://github.com/ted-juan/six-grand-endless-wonders (live at
https://ted-juan.github.io/six-grand-endless-wonders/). When in doubt, read
how it does something there (e.g. its raw `slides.md` via
`https://raw.githubusercontent.com/ted-juan/six-grand-endless-wonders/main/slides.md`)
before inventing a new way.

**Works with the official `slidev` skill.** If it is installed (from
https://github.com/slidevjs/slidev/tree/main/skills/slidev), use it as the
**syntax reference**: layouts, components, animations, code features, export
flags. This skill owns the **workflow**: the content rule, pictures, layout
checks, publishing and the traps below. When the two disagree on Slidev
syntax, the official skill wins (it tracks the current release); when they
disagree on process, this one wins.
If it is **not** installed, tell the user once (one line) that it is
recommended and point to README → Install → Step 3; then carry on without it.

## Golden rule: the speaker's content wins

The words on the slides are the presenter's. Polish **presentation**
(layout, photos, maps, typography), never **substance**:

- Keep every fact, number, name, price, time and the slide order unless the
  user explicitly asks to change them. Preserve the original draft beside the
  new deck (e.g. `slides.original.md`) so it can be diffed.
- When fixing a deck that belongs to someone else (a teammate's repo), touch
  only build/deploy files and image `src` plumbing. Never `git reset --hard`
  / force-push their repo to "sync" it with yours — that silently replaces
  their talk. Hand them a scoped prompt instead (see "Fixing someone else's
  deck").
- After editing, `git diff slides.md` and confirm every changed line is one
  you meant to change.
- When the deck was made from a draft, **prove it** with
  `scripts/check-wording.mjs` (Node ≥ 18, no install):
  ```bash
  node <skill>/scripts/check-wording.mjs slides.original.md slides.md
  ```
  `MISSING` must be 0 (exit code 1 otherwise). `OUT OF ORDER` lists chunks
  that moved: a label moved into a kicker is fine, a moved paragraph is not.
  `ADDED` lists every piece of text the deck has that the draft doesn't
  (cover title, kickers, picture labels, credits): show it to the user
  and get each one confirmed.
- Motion is presentation, so micro-animations (§2d) are applied by default —
  but any **words** an animation brings with it (a caption, a badge such as
  "Arrived", an `effectLabel`) are added text and go on the `ADDED` list.

## 1. Scaffold

Copy `templates/base/` from this skill into the new project dir:

| Template file | Notes |
|---|---|
| `package.json` | Replace `__DECK_NAME__`; set `__PNPM_VERSION__` to `pnpm -v` (CI's `pnpm/action-setup` reads `packageManager`) |
| `pnpm-workspace.yaml` | `allowBuilds: playwright-chromium: true` — pnpm ≥10 refuses unapproved postinstall scripts, and without it PDF export has no browser |
| `gitignore` | Rename to `.gitignore` |
| `setup/asset.ts`, `setup/main.ts` | Base-path helper, exposed as `asset()` in components and `$asset()` in Markdown |
| `components/Pic.vue` | Photo card with corner label: `<Pic src="/photos/x.jpg" label="..." class="h-28" />` |
| `components/Credit.vue` | Small bottom-right attribution line: `<Credit>Author (CC BY-SA 4.0), via Wikimedia Commons</Credit>` |
| `setup/motion.ts` | `useMotion()` → `play` (slide is on screen live) / `still` (export, overview, reduced motion). Every animation uses it, so exports always show the final frame |
| `components/CountUp.vue`, `TypeIn.vue`, `Particles.vue` | Micro-animation building blocks (§2d). `Pic.vue` also takes `motion="kenburns" \| "pan" \| "reveal"` |
| `.github/workflows/deploy.yml` | GitHub Pages deploy (see §4) |
| `style.css` | Compact table rows, and makes `class: text-sm` / `text-xs` really shrink body text and tables (seriph's defaults are too tall: a 10-row table runs off the slide). Slidev loads it automatically |
| `slides.md` | Starter deck: cover, two-column content slide with `<Pic>` stack, single-photo slide, closing slide with QR. Replace every `__PLACEHOLDER__`; delete slide types the talk doesn't need |

Then `pnpm install`, put the speaker's draft into `slides.md` (keep the
original as `slides.original.md`), add pictures (§2b), `pnpm dev` to preview.

## 2. Authoring conventions

- Headmatter: `theme: seriph`, a full-bleed cover `background:`, `title:`,
  and `exportFilename:` (becomes the PDF name on the download button).
- **Fonts**: for Chinese (or mixed Chinese/English) decks set
  `fonts: { sans: 'Noto Sans,Noto Sans TC', serif: 'Noto Serif,Noto Serif TC', mono: Fira Code }`
  (Google Fonts, auto-loaded; use `SC` for Simplified, `JP` for Japanese).
  Latin font **first**: with only `Noto Sans TC`, English apostrophes and
  quotes (`Taipei’s`) are drawn full-width and look like `Taipei’ s`.
  Without it CJK text falls back to whatever the viewer's system has. The
  starter `slides.md` already sets it. Fonts change text width, so run the
  overflow check (§2e) after changing them.
- Too much content for one slide: first `zoom: 0.9` (or `0.8`) in that
  slide's frontmatter, which scales the whole slide; then `class: text-sm` /
  `text-xs`; then split the slide. Never cut words to make it fit.
- Slide header pattern: `### Section · Subtitle` kicker above `## Title`.
  `style.css` shrinks the kicker to a muted breadcrumb; without it seriph
  draws the h3 almost as big as the h2 and viewers read the hierarchy as
  upside down ("the subtitle is bigger than the title").
- Dense content slides: `class: text-sm` + a two-column
  `grid grid-cols-[1fr_230px]` with bullets left and a stack of `<Pic>` right.
- Closing slide: `layout: cover` with its own background.
- **Every image path that starts with `/` must go through the helper**:
  - Components: `<Pic src="/photos/x.jpg">` (Pic calls `asset()` internally).
  - Raw tags in Markdown: `<img :src="$asset('/x.jpg')">` — never
    `<img src="/x.jpg">`.
  - Exception: headmatter/frontmatter `background:` — Slidev resolves the
    base itself.
- Photos go in `public/photos/`, compressed to ~300–600 KB each. Prefer
  Wikimedia Commons (free licences) and credit each one on its slide with
  `<Credit>` — author + licence + "via Wikimedia Commons". The user's own
  photos get "*Photo / Taken by our group*" (or similar) instead.
  To find them automatically, see §2b.

## 2b. Pictures for every slide that needs one (automatic)

Go through the **whole deck**, not just the topic: decide for each slide
whether it needs a visual, and which kind. Never invent facts to justify a
picture; the subject comes from words already on the slide.

### Step 1: image plan (show it to the user before making anything)

Make one table row per slide:
`# | slide title | needs a visual? | kind | source | file | motion (§2d)`.

| Slide contains | Visual kind | Source (in order of preference) |
|---|---|---|
| Already has a picture, map, chart, code or a full table | none | skip; don't crowd it |
| Title-only section break, quote, agenda | usually none (or a background) | Commons photo as `background:` if it fits |
| Cover / closing slide | full-bleed background | Commons photo, `--orientation landscape` |
| A real place, building, object, species, artwork, event | photo | Commons (`find-image.mjs`). The user's own photos win if they have them |
| Steps, process, architecture, timeline, before→after, comparison | diagram | Mermaid block, or an SVG drawn by the agent into `public/diagrams/` |
| Numbers the slide already states (cost, %, counts) | chart | SVG or Mermaid chart using **exactly** those numbers |
| An idea with no real subject ("teamwork", "our goal", "challenges") | illustration | AI image (Step 3), else a simple agent-drawn SVG/icon (`i-ph-*` icons are built in) |
| **Mostly empty** (content ends above ~65% of the height at the deck's normal font size) | small picture beside the text, a diagram / big-number boxes built from the slide's own words, **or just white space**. Never enlarge the text to fill it | Decide yourself, no need to ask per slide: steps or a sequence → Mermaid; numbers the text states → stat boxes; an idea → small AI illustration in the deck's shared style; a real subject → Commons. Layout: `<div class="grid grid-cols-[1fr_360px] gap-8 items-center">` text, then `<Pic … class="h-64" />` |

Wait for the user to OK or edit the plan, then go slide by slide.

### Step 2: real photos from Wikimedia Commons (default for real subjects)

`scripts/find-image.mjs` from this skill (Node ≥ 18, no install). Run it
from the deck directory so `image-credits.json` lands there. Use English or
the local name, plus city/country to disambiguate.

```bash
node <skill>/scripts/find-image.mjs --query "Longshan Temple Taipei" --list
node <skill>/scripts/find-image.mjs --query "Longshan Temple Taipei" --pick 0 \
     --out public/photos/longshan.jpg            # --orientation landscape for covers
```

It downloads a ~1280–1600 px JPEG (kept under ~800 KB), prints JSON with a
ready `credit` string, and appends to `image-credits.json`.

### Step 3: AI-generated images (ask first, abstract subjects only)

Use the first route the current agent actually has. Check, don't assume.

| Route | When it exists | Notes |
|---|---|---|
| The agent's own image tool | Google Antigravity (built-in Nano Banana), Gemini CLI with the `nanobanana` extension, or any connected image-generation MCP tool | Save the output into `public/photos/`. Claude Code and Gemini Code Assist in VS Code have **no** built-in raster image generator |
| `find-image.mjs --source ai` | `OPENAI_API_KEY` (default `gpt-image-2`) or `GEMINI_API_KEY` (default `gemini-2.5-flash-image`); override with `SLIDEV_IMAGE_MODEL` | Works from any agent, including Claude Code. Each image costs money |
| Agent-drawn SVG | always | Flat icon-style illustration or diagram, free. Good enough for most concept slides |

```bash
node <skill>/scripts/find-image.mjs --source ai \
     --prompt "flat illustration of students planning a trip on a map, no text" \
     --out public/photos/planning.jpg
```

- Prompt: describe the slide's idea + "no text, no logos, no watermarks" +
  one shared style for the whole deck (e.g. "flat pastel illustration") so
  the pictures match each other.
- Never generate a fake photo of a real place, person, logo or event that
  the talk presents as real. Use a photo or a diagram for those.
- Credit as `AI-generated image (<model>)` in the slide's `<Credit>`.
- `--source auto` = Commons first, AI fallback when a key is set.

### Step 4: check and insert

1. **Look at every image** (open the file) before using it. Wrong place,
   watermark, text baked into the picture, a recognisable private person in
   close-up, or style that clashes → `--pick` the next one, change the query,
   or regenerate.
2. Insert with `<Pic src="/photos/x.jpg" label="..." />` (label = the
   slide's own wording) or `<img :src="$asset('/diagrams/x.svg')" />`, and add
   the `credit` string to the slide's `<Credit>`.
3. **Mermaid layout:** a wide diagram (`flowchart LR` with 4+ nodes, or
   two subgraphs) does not fit a narrow grid column; it spills off the
   right/bottom edge. Put it full-width **below** the text, use
   `direction LR` inside subgraphs, and shrink with
   ```` ```mermaid {scale: 0.6} ````. Subgraphs in an `LR` chart stack in
   reverse: declare the one that should appear on top last.
4. Adding visuals is layout, so the content rule still holds:
   `git diff slides.md` shows only `<Pic>`/`<img>`/`<Credit>`/Mermaid/frontmatter
   lines. If a slide has no room for a picture without shrinking the text,
   say so and skip it rather than cutting words.

Commit `image-credits.json` with the deck: it records where every picture
came from and its licence.

## 2c. Advanced Slidev features — use them, but by the content rule

A deck that is just static pages wastes Slidev. On every new deck (and when
polishing an existing one) **propose** the features below, in this order.
"Apply by default" items only change *how* content appears, never *what* it
says. "Ask first" items add words or change pacing, which belong to the
speaker.

| Feature | Syntax | When | Policy |
|---|---|---|---|
| Slide transitions | headmatter `transition: slide-left` (per slide: frontmatter `transition: fade`) | Every deck | Apply by default |
| Reveal points one by one | Wrap a Markdown list in `<v-clicks>` … `</v-clicks>` (blank line after the opening tag and before the closing tag). For non-list rows, put `<v-clicks>` *inside* the flex/grid container around the row `<div>`s so the layout is kept | Itinerary/agenda lists, multi-row explainer slides. **Not tables**: row-by-row tables annoyed the presenter; reveal a table row by row only if asked | Apply by default, mention it to the user |
| Hand-drawn emphasis | `<span v-mark.underline.orange>NT$ 1,531</span>` (`.circle`, `.box`; any colour name). For text that can wrap use the object form with `multiline: true`: `<span v-mark="{ type: 'underline', color: 'orange', multiline: true }">`. **Highlight needs a see-through colour** (8-digit hex, alpha ~35%): `<span v-mark="{ type: 'highlight', color: '#facc1559', multiline: true }">` — never `.highlight.yellow`, which paints solid yellow over the words. Without a value it fires on the next click, after any `v-clicks` items above it in the page | The one key number/claim per slide (cost, total, date) | Apply by default; wrap existing text only, never retype it |
| QR code to the live deck | Generate once with the `qrcode` npm library in a scratch dir: `npm i qrcode@1.5.4` then `node -e "require('qrcode').toFile('<deck>/public/qr.svg','<live URL>',{type:'svg',margin:1},e=>{if(e)throw e})"` (the `npx qrcode` CLI hung in testing). On the closing slide: `<div class="absolute bottom-6 left-6"><img :src="$asset('/qr.svg')" class="w-20 rounded bg-white p-1" /></div>`, which keeps it clear of `<Credit>` at bottom-right | Decks that are published | Apply after the URL exists |
| Speaker notes + presenter mode | HTML comment at the end of a slide: `<!-- what to say -->`. Present with `p` key (or `/presenter`): notes, next-slide preview and timer | Any talk | **Ask first.** The speaker writes the notes; never invent them |
| `layout: image-right` / `image-left` with `image:` | Slide frontmatter | One big photo next to text | Ask first (changes the layout the speaker knows) |

Rules of thumb:

- Never add `v-click`/`v-clicks` to a slide whose frontmatter sets
  `clicks:` (e.g. JourneyMap slides): that count drives the map animation.
- The PDF export shows each slide in its **final** click state, so reveals
  don't hide anything from readers of the PDF.
- Not for non-technical talks: Shiki Magic Move, Monaco editor, Twoslash,
  code-line highlighting. Mermaid only for the diagrams in the §2b image plan.
- After applying, `git diff slides.md` must show only wrappers (`<v-clicks>`,
  `<span v-mark…>`), frontmatter, and the QR image. No word of the talk
  changed.

## 2d. Creative micro-animations — think up at least one per content slide

A deck people remember has small, playful motion that **illustrates what the
slide already says**: the budget number counts up, sky lanterns drift over
the Shifen photo, moon blocks land as 聖筊 at the temple, steam curls off the
night-market snacks. Don't wait to be asked and don't stop at the catalog
below: for **every** content slide, ask "what one small motion would make
this slide's own subject come alive?" and build it. Motion changes *how*
content appears, so it is applied by default (golden rule still holds: no
new words without confirmation).

### Step 1: put it in the plan

Fill the `motion` column of the §2b plan for every slide, then show the plan.
Aim for variety across the deck (not lanterns on every slide) and one idea
per slide that is specific to *that* slide; "none" is fine for a slide
that is already busy (a dense table) or solemn.

### Step 2: pick from the kit, or invent

| Slide has… | Ready-made (templates/base) | Example |
|---|---|---|
| A key number / total / % | `<CountUp>` around the existing text | `<span v-mark.underline.orange><CountUp>NT$ 1,531</CountUp></span>` |
| A cover subtitle / quote / command (one short line) | `<TypeIn>` | `<p><TypeIn>3-Day Northern to Central Taiwan</TypeIn></p>` |
| A full-width or hero photo | `<Pic motion="kenburns">` (wide: `pan`; diagram/before-after: `reveal`) | `<Pic src="/photos/lukang.jpg" motion="kenburns" class="h-72" />` |
| Lanterns, festivals, wishes | `<Particles kind="lantern" />` | over the cover photo or a Shifen picture |
| Temples, shrines | `<Particles kind="smoke" />` (incense) | over the temple photo |
| Food, drinks, hot springs, markets | `<Particles kind="steam" class="absolute …" :count="4" />` | placed over the food photo, not over text |
| Money, prices, savings | `<Particles kind="coin" :count="5" />` | beside the budget table |
| Gardens, spring, blossoms / autumn | `petal` / `leaf` | |
| Celebration, "thank you", results | `confetti`, `sparkle`, `heart` | closing slide |
| Water, sea, aquarium, science | `bubble`; winter / mountains: `snow` | |
| Itinerary, route, day plan | `JourneyMap` (§3) with per-stop `effect` | |

**Invent when nothing above fits — that is the expected case, not the
exception.** Write a new small component in `components/` (SVG shapes +
CSS keyframes, ≈20–80 lines, no new npm packages, no external URLs). Examples already invented for decks: `Stagger` (agenda cards rise in
one by one) and `CoachRide` (a coach drives a dashed road between two
place names) in the reference deck's `components/`. More ideas
to get going: a train or bus icon crossing the slide along a dashed line
(transport legs), a clock hand sweeping to the stated time, bars growing to
the slide's own numbers, a stamp landing on "Day 2", a bubble-tea cup
filling, waves under a harbour photo, incense smoke over a temple, a map pin
dropping and bouncing, an arrow drawing itself between before → after, a
progress bar across the top for a multi-part section, a magnifier sweeping a
diagram, a thermometer rising on a weather fact, a heartbeat line on a
health fact. Pattern to copy:

```vue
<script setup lang="ts">
import { useMotion } from '../setup/motion'
const { play } = useMotion()          // true only while the slide is on screen live
</script>
<template>
  <!-- add the class only while playing; the default render (no class) IS the final frame -->
  <svg class="motion" :class="{ go: play }" viewBox="0 0 120 40" aria-hidden="true">…</svg>
</template>
<style scoped>
.go .bus { animation: drive 2.4s cubic-bezier(.4,0,.2,1) both; }
@keyframes drive { from { transform: translateX(-100px); } to { transform: translateX(0); } }
</style>
```

### Rules (so the motion delights instead of distracting)

- **Illustrate, don't decorate at random**: the subject comes from words or
  pictures already on the slide. Never imply a fact the talk doesn't state.
- **No new words.** An animation may not add captions, numbers or labels
  unless the user confirms them (they go on the `ADDED` list).
- **Small and short**: at most 1–2 animations per slide; one-shot motions
  finish in ≤ 2 s; looping ones (`Particles`, a bob) stay small, few and
  away from body text — over a photo or an empty side, never behind
  paragraphs.
- **Final frame = the static slide.** Build every animation with
  `useMotion()`: the default render (no `play`) must be the finished state,
  so PDF/PNG/PPTX exports, the overview grid and reduced-motion viewers see
  a complete slide. `Particles` freeze mid-flight in exports (scattered,
  still fine).
- **Don't fight the click count**: no `v-clicks` on a slide with a
  `clicks:` frontmatter; `CountUp`/`TypeIn` start when the slide opens, not
  on a click.
- **Respect the speaker's tone**: skip playful motion on serious or sad
  content (memorials, accidents, medical results); use only subtle ones
  (`reveal`, `kenburns`) there.
- Wrap only existing text (`<CountUp>NT$ 1,531</CountUp>`): `check-wording`
  must still pass, and `git diff slides.md` shows only wrappers/components.

### Step 3: see it move

Exports show only the final frame, so check the motion live:

```bash
node <skill>/scripts/check-motion.mjs        # → shots-motion/<n>-a.png (running) and <n>-b.png (settled)
```

Open the PNGs: the `a` shot must show the animation in progress, `b` the
finished slide; nothing may cover text; page errors are printed (exit 1).
JourneyMap slides get one shot per click. Delete `shots-motion/` after.

## 2e. Fit every slide, then check — measure, then look

`pnpm dev` hides problems you only see at the real slide size. After the
content and pictures are in (and after changing fonts), run these in the
deck directory. Each one starts its own Slidev server and uses the deck's
`playwright-chromium`; ~1–2 s per slide.

1. **Auto-fit** (decide the layout yourself; don't ask the user per slide):
   ```bash
   node <skill>/scripts/fit-slides.mjs        # --dry to only report
   ```
   **One font size for the whole deck.** Text that jumps between big and
   small from slide to slide looks uneven, so sparse slides are never
   enlarged to fill the space: white space is fine, or add a small picture
   (§2b). The script removes per-slide `class: text-sm/xs` and `zoom:`,
   leaves every slide at zoom 1, and shrinks only a slide that overflows,
   just enough to fit and never below 0.85. Slides that still overflow at
   0.85 are listed: split them (same words, same order). Only frontmatter
   changes, through Slidev's own parser. Two exceptions it handles:
   - **Slides with `v-mark` never get a zoom** (see Traps: the marks are
     drawn in the wrong place in PDF/PNG/PPTX). If one overflows it gets
     `class: text-sm` (one step, no further) instead.
   - **Slides with Mermaid**: zooming them above 1 makes the diagram render
     wider than measured and it gets cut at the right edge (moot now that
     nothing is enlarged, but keep it in mind if you raise `--max`).
2. **Overflow check** (exit code 1 if any element runs past the bottom or
   right edge; measures every element, including Mermaid's SVG):
   ```bash
   node <skill>/scripts/check-overflow.mjs
   ```
   Fix what it reports: smaller `{scale: …}` on a diagram, move a wide
   diagram below the text, `class: text-sm`, or split the slide (same order,
   same words). Re-run.
3. **Look** at every slide — the scripts can't judge readability, marker
   placement or balance:
   ```bash
   pnpm exec slidev export --format png --output shots      # open the PNGs
   ```
   Check: `v-mark` marks sit on their words, diagrams readable and in the
   right order, pictures well cropped, `<Credit>` not covering content, no
   slide still half empty (→ §2b "Still mostly empty"). Delete `shots/`.

If the user has `pnpm dev` open in a browser while you run these, tell them
to hard-reload the tab afterwards (see Traps).

## 3. Optional: animated journey map (Taiwan itineraries)

For travel/itinerary decks, copy `templates/journey-map/`:
`components/JourneyMap.vue`, `data/taiwan-map.json` (pre-projected township
outlines, ~840 KB), and `data/journeys.example.ts` → `data/journeys.ts`.

- Fill `journeys[day]` with stops: `name`, `time`, `lon`, `lat`, optional
  `thumb` (a `/photos/...` path), `side` for the label, and `leg` (`mode` +
  `note`) describing how you got there from the previous stop.
- Copy `components/SceneEffect.vue` too, and `templates/base/components/Particles.vue`
  + `setup/motion.ts` if the deck didn't start from `templates/base/`.
- On the slide: `<JourneyMap :day="1" />`, and in that slide's frontmatter
  set `clicks:` = number of stops **+ 1**. Click 0: overview with a mini
  traveller at the first stop. Click 1: zoom to stop 1 and open its photo
  scene card (slow Ken Burns zoom). Each next click: back to the map, the
  traveller walks (vehicle icon for train/bus) along the leg, then that
  stop's scene opens. Last click: overview of all routes.
- **Per-stop effect** — give every stop whose place suggests one an
  `effect` (decide it yourself, from the place itself): `jiaobei` (moon blocks
  tossed → 聖筊, any temple), `incense` (temple smoke), `plane` (airports,
  departure: a plane takes off with a contrail), `lanterns` (Shifen/Pingxi, festivals), `steam`
  (night markets, food, hot springs), `sparkle` (viewpoints, night views,
  the final stop), `petals` (gardens, blossoms). `effectLabel` adds a caption
  → added text, confirm it. A place that needs something new (a train
  whistle puff, waves at a harbour, a bubble-tea cup filling) → add a block
  to `SceneEffect.vue` (§2d "invent").
- The basemap only covers Taiwan. For other regions you need a different
  pre-projected map JSON with the same `proj` shape.

## 4. Publish

### GitHub Pages (preferred: free, auto-deploys on push)

1. Create an **empty** repo (no README/licence/.gitignore), add the remote,
   `git push -u origin main`. If `gh` is not installed, the user must create
   the repo on github.com — creating it needs the API, pushing only needs SSH.
2. The template workflow builds with
   `pnpm exec slidev build --download --base /${{ github.event.repository.name }}/`,
   installs Chromium for the PDF, and copies `index.html` → `404.html`.
3. The **user** must enable Pages once: repo **Settings → Pages → Source:
   GitHub Actions**. Until then the build job passes and the deploy job
   fails. After enabling, re-run the failed workflow.
4. Verify (see §5). URL: `https://<owner>.github.io/<repo>/`.

### Editable PowerPoint (for people who edit in PowerPoint)

Slidev can rebuild the slides as native PowerPoint shapes with real,
selectable text (tested with Slidev 52.20):

```bash
pnpm exec slidev export --format pptx-editable --with-clicks=false \
     --output <exportFilename>-editable.pptx
```

- `--with-clicks=false` matters: PPTX formats default to one page per click
  (a 35-slide deck became 64 pages).
- Mermaid diagrams, SVGs, KaTeX and gradients stay pictures; photos and
  tables come through. Fonts are named, not embedded: the recipient needs
  Noto Sans TC (or whatever `fonts:` sets) installed, else PowerPoint
  substitutes one.
- The web deck and `slides.md` stay the source of truth; edits made in the
  PPTX don't flow back.

### Netlify (alternative)

`pnpm run deploy:netlify` (first run: `npx netlify-cli login`, then pick or
create a site; the link is stored in `.netlify/state.json`). For Netlify the
deck lives at the domain root, so no `--base` is needed. Slidev's build
already writes `dist/_redirects`, so `/2` works.

1. Login opens a browser, so the **user** runs `! npx -y netlify-cli login`.
2. From the agent, without prompts: `pnpm build`, then
   `npx -y netlify-cli deploy --prod --dir dist --no-build --site-name <deck>`
   the first time (creates `<deck>.netlify.app`; later deploys reuse
   `.netlify/state.json`).
3. Check with curl (§5). **401 "Login Redirect" on every page** = the account
   requires Netlify team login for all sites, so only the owner can see it.
   Make *this* site public only if the user asked for public:
   `npx -y netlify-cli api updateSite --data '{"site_id":"<deck>.netlify.app","body":{"sso_login":false}}'`.
   Internal decks: leave the protection on, and say who can open it.

## 5. Verify the live site — don't trust a green check

A green Actions run does **not** mean the page works. Check with curl:

```bash
u=https://<owner>.github.io/<repo>
curl -s "$u/" | grep -o 'src="[^"]*assets/index[^"]*"'   # must start with /<repo>/assets/
for p in / /2 /photos/<some>.jpg /<exportFilename>.pdf; do
  printf "%s " "$p"; curl -s -o /dev/null -w "%{http_code}\n" "$u$p"; done
```

Expected: `/` 200, images 200, PDF 200. `/2` returns **404 with the deck's
HTML** (that's the 404.html SPA fallback — browsers render it fine; check the
body contains the deck `<title>`). Actions status without `gh`:
`curl -s https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1`.

## Traps already hit (symptom → cause → fix)

| Symptom | Cause | Fix |
|---|---|---|
| Live page is **blank**, Actions all green | `pnpm build -- --base /repo/`: pnpm forwards the literal `--`, so slidev treats `--base` as positional and ignores it; HTML loads `/assets/...` from the domain root → 404 | `pnpm exec slidev build --download --base /repo/` (or `pnpm build --base /repo/`, no `--`) |
| JS loads but **photos broken** | `<img src="/x.jpg">` or a component using `src` directly points at the domain root | Route through `asset()` / `$asset()` |
| Opening / refreshing `/2` gives GitHub's 404 page | GitHub Pages has no SPA rewrite | `cp dist/index.html dist/404.html` in the workflow |
| Build job ✅, deploy job ❌ | Pages not enabled / Source not set to GitHub Actions | User flips Settings → Pages → Source: GitHub Actions, re-run |
| `pnpm install` errors about build scripts, or PDF export can't find a browser | pnpm blocks playwright's postinstall | `allowBuilds: playwright-chromium: true` in `pnpm-workspace.yaml`; CI also runs `playwright install --with-deps chromium` |
| A long table or text runs off the bottom of the slide; `class: text-xs` changes nothing | seriph's table cell padding and element font sizes override the class | `zoom: 0.8` in that slide's frontmatter fixes most; keep `templates/base/style.css` for compact tables; split the slide if it still overflows. `check-overflow.mjs` finds them (§2e) |
| A Mermaid diagram is cut off at the right/bottom | Wide flowchart inside a narrow grid column | Put it full-width below the text, `{scale: 0.6}` (§2b Step 4) |
| `pnpm -v` after `corepack enable pnpm` fails: `Cannot find module .../corepack/v1/pnpm/<ver>/bin/pnpm.cjs` | Older corepack (e.g. 0.31 in Node 22.14) can't run pnpm ≥ 11's package layout | `corepack disable pnpm && npm i -g pnpm` (with nvm this needs no sudo) |
| Open browser tab suddenly shows raw text ("Enter fullscreen", "Go to next slide"), a huge credit line mid-slide, wrong heading sizes; a fresh tab is fine | The tab lost its UnoCSS styles after other Slidev processes (export, check-overflow, a second dev server) re-optimized the shared `node_modules/.vite` cache while `pnpm dev` was serving | Hard-reload the tab (Ctrl+Shift+R) or restart `pnpm dev`. Before telling the user to look, reload; after running exports/checks next to their open tab, warn them to reload |
| `v-mark` underline/highlight drawn in the wrong place (offset, wrong length, across a diagram) in exported PDF/PNG/PPTX | The slide has `zoom:` (Slidev's or CSS `zoom`); rough-notation measures in unzoomed coordinates | No zoom on slides with `v-mark` (`fit-slides.mjs` enforces it); use `class: text-sm` to shrink instead |
| A `v-mark.highlight` turns into a big yellow block when the marked text wraps to a second line | Rough-notation draws one box around a multi-line span unless told otherwise | `<span v-mark="{ type: 'highlight', color: '#facc1559', multiline: true }">` (`multiline` also for underlines) |
| Highlighted words are hidden under solid yellow | Rough-notation's SVG is drawn on top of the text, and a colour name like `yellow` is fully opaque | Use a colour with alpha, e.g. `#facc1559` (yellow at ~35%); check the PNG that the words are readable |
| Mermaid diagram cut at the right edge only on zoomed slides; `check-overflow` said fine | Mermaid sizes the SVG at render time; zoom > 1 makes it wider than measured, and the SVG is not inside `div.mermaid` | Keep Mermaid slides at zoom ≤ 1, shrink with `{scale: …}`; the checker now measures all elements |
| `gh: command not found`; `sudo` via `!` says "a terminal is required" | gh not installed; `!` commands have no TTY for the sudo password | Repo creation on github.com, or the user installs gh in their own terminal |
| Netlify site returns 401 "Login Redirect" on every page | Account-wide "require Netlify team login" | Public on purpose: `updateSite` with `sso_login: false` (§4 Netlify) |

## Fixing someone else's deck

When a teammate's deployed copy is broken, diagnose read-only (public API +
raw.githubusercontent.com + curl the live site), then write a prompt they can
paste into their own AI assistant (e.g. Gemini in VS Code). The prompt must:

1. State the symptom and root cause in one or two lines.
2. Start with hard rules: content is theirs — do not change any text, slide
   order, layout or styling; `slides.md` may change only the listed `<img>`
   lines; no reformatting; show before/after for each change and wait for
   approval.
3. List each change with exact before → after (workflow line, new
   `setup/asset.ts` + `setup/main.ts`, the `src` bindings in each component,
   the specific `<img>` lines) — check their repo first; their files may
   differ from yours.
4. End with: `git diff` to confirm only those lines changed, commit + push,
   wait for Actions, open the URL and check images and `/2`.

All edits are plain text and the build runs on GitHub's Ubuntu runner, so the
same prompt works on macOS, Windows or Linux.
