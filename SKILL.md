---
name: slidev-deck
description: Build, polish, and publish a presentation as a Slidev web deck (Markdown → website + downloadable PDF), deployed to GitHub Pages or Netlify. Covers the project skeleton and a starter slides.md (pnpm, seriph theme, playwright PDF export), an automatic image plan for every slide that needs a visual (free-licence Wikimedia Commons photos with credit lines, agent-drawn diagrams/charts, or AI-generated images via the agent's own image tool or OpenAI/Gemini when asked), reusable components (Pic photo card, Credit attribution, optional animated Taiwan JourneyMap), advanced Slidev features applied without touching the talk's wording (transitions, v-clicks reveals, v-mark emphasis, QR code; speaker notes only with the speaker's input), the base-path asset() helper that keeps images working under /<repo>/, a GitHub Pages workflow that actually honours --base, and the traps that produced blank pages / broken images / 404 on /2. Also covers fixing someone else's deployed deck without touching their speaking content. Use when the user asks to make/beautify slides or a presentation (簡報/投影片), turn a Markdown or text draft into a deck, publish slides to GitHub Pages or Netlify, or find or generate pictures, diagrams or charts for slides, or debug a Slidev deck that shows a blank page or missing images once deployed.
---

# Slidev deck: build → polish → publish

Reference deck this was distilled from: repo
https://github.com/ted-juan/six-grand-endless-wonders (live at
https://ted-juan.github.io/six-grand-endless-wonders/). When in doubt, read
how it does something there (e.g. its raw `slides.md` via
`https://raw.githubusercontent.com/ted-juan/six-grand-endless-wonders/main/slides.md`)
before inventing a new way.

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
| `.github/workflows/deploy.yml` | GitHub Pages deploy (see §4) |
| `slides.md` | Starter deck: cover, two-column content slide with `<Pic>` stack, single-photo slide, closing slide with QR. Replace every `__PLACEHOLDER__`; delete slide types the talk doesn't need |

Then `pnpm install`, put the speaker's draft into `slides.md` (keep the
original as `slides.original.md`), add pictures (§2b), `pnpm dev` to preview.

## 2. Authoring conventions

- Headmatter: `theme: seriph`, a full-bleed cover `background:`, `title:`,
  and `exportFilename:` (becomes the PDF name on the download button).
- Slide header pattern: `### Section · Subtitle` kicker above `## Title`.
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
`# | slide title | needs a visual? | kind | source | file`.

| Slide contains | Visual kind | Source (in order of preference) |
|---|---|---|
| Already has a picture, map, chart, code or a full table | none | skip; don't crowd it |
| Title-only section break, quote, agenda | usually none (or a background) | Commons photo as `background:` if it fits |
| Cover / closing slide | full-bleed background | Commons photo, `--orientation landscape` |
| A real place, building, object, species, artwork, event | photo | Commons (`find-image.mjs`). The user's own photos win if they have them |
| Steps, process, architecture, timeline, before→after, comparison | diagram | Mermaid block, or an SVG drawn by the agent into `public/diagrams/` |
| Numbers the slide already states (cost, %, counts) | chart | SVG or Mermaid chart using **exactly** those numbers |
| An idea with no real subject ("teamwork", "our goal", "challenges") | illustration | AI image (Step 3), else a simple agent-drawn SVG/icon (`i-ph-*` icons are built in) |

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
3. Adding visuals is layout, so the content rule still holds:
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
| Reveal points one by one | Wrap a Markdown list in `<v-clicks>` … `</v-clicks>` (blank line after the opening tag and before the closing tag). For non-list rows, put `<v-clicks>` *inside* the flex/grid container around the row `<div>`s so the layout is kept | Itinerary/agenda lists, multi-row explainer slides | Apply by default, mention it to the user |
| Hand-drawn emphasis | `<span v-mark.underline.orange>NT$ 1,531</span>` (`.circle`, `.highlight`, `.box`; any colour name). Without a value it fires on the next click, after any `v-clicks` items above it in the page | The one key number/claim per slide (cost, total, date) | Apply by default; wrap existing text only, never retype it |
| QR code to the live deck | Generate once with the `qrcode` npm library in a scratch dir: `npm i qrcode@1.5.4` then `node -e "require('qrcode').toFile('<deck>/public/qr.svg','<live URL>',{type:'svg',margin:1},e=>{if(e)throw e})"` (the `npx qrcode` CLI hung in testing). On the closing slide: `<div class="absolute bottom-6 left-6"><img :src="$asset('/qr.svg')" class="w-20 rounded bg-white p-1" /></div>`, which keeps it clear of `<Credit>` at bottom-right | Decks that are published | Apply after the URL exists |
| Speaker notes + presenter mode | HTML comment at the end of a slide: `<!-- what to say -->`. Present with `p` key (or `/presenter`): notes, next-slide preview and timer | Any talk | **Ask first.** The speaker writes the notes; never invent them |
| `layout: image-right` / `image-left` with `image:` | Slide frontmatter | One big photo next to text | Ask first (changes the layout the speaker knows) |

Rules of thumb:

- Never add `v-click`/`v-clicks` to a slide whose frontmatter sets
  `clicks:` (e.g. JourneyMap slides): that count drives the map animation.
- The PDF export shows each slide in its **final** click state, so reveals
  don't hide anything from readers of the PDF.
- Not for non-technical talks: Shiki Magic Move, Monaco editor, Twoslash,
  code-line highlighting. Mermaid only if the content already has a diagram.
- After applying, `git diff slides.md` must show only wrappers (`<v-clicks>`,
  `<span v-mark…>`), frontmatter, and the QR image. No word of the talk
  changed.

## 3. Optional: animated journey map (Taiwan itineraries)

For travel/itinerary decks, copy `templates/journey-map/`:
`components/JourneyMap.vue`, `data/taiwan-map.json` (pre-projected township
outlines, ~840 KB), and `data/journeys.example.ts` → `data/journeys.ts`.

- Fill `journeys[day]` with stops: `name`, `time`, `lon`, `lat`, optional
  `thumb` (a `/photos/...` path), `side` for the label, and `leg` (`mode` +
  `note`) describing how you got there from the previous stop.
- On the slide: `<JourneyMap :day="1" />`, and in that slide's frontmatter
  set `clicks:` = number of stops (= legs + 1). Click 0 shows the overview,
  each click flies the camera along one leg, the last click shows all routes.
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

### Netlify (alternative)

`pnpm run deploy:netlify` (first run: `npx netlify-cli login`, then pick or
create a site; the link is stored in `.netlify/state.json`). For Netlify the
deck lives at the domain root, so no `--base` is needed.

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
| `gh: command not found`; `sudo` via `!` says "a terminal is required" | gh not installed; `!` commands have no TTY for the sudo password | Repo creation on github.com, or the user installs gh in their own terminal |

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
