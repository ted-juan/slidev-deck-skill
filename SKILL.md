---
name: slidev-deck
description: Build, polish, and publish a presentation as a Slidev web deck (Markdown → website + downloadable PDF), deployed to GitHub Pages or Netlify. Covers the project skeleton (pnpm, seriph theme, playwright PDF export), reusable components (Pic photo card, Credit attribution, optional animated Taiwan JourneyMap), the base-path asset() helper that keeps images working under /<repo>/, a GitHub Pages workflow that actually honours --base, and the traps that produced blank pages / broken images / 404 on /2. Also covers fixing someone else's deployed deck without touching their speaking content. Use when the user asks to make/beautify slides or a presentation (簡報/投影片), turn a Markdown or text draft into a deck, publish slides to GitHub Pages or Netlify, or debug a Slidev deck that shows a blank page or missing images once deployed.
---

# Slidev deck: build → polish → publish

Reference project this was distilled from: `~/project/slides/rebecca`
(repo `ted-juan/six-grand-endless-wonders`, live at
https://ted-juan.github.io/six-grand-endless-wonders/). When in doubt, read
how it does something before inventing a new way.

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

Then `pnpm install`, write `slides.md`, `pnpm dev` to preview.

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
