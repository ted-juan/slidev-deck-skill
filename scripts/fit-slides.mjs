#!/usr/bin/env node
// fit-slides.mjs: keep one font size across the deck; shrink a slide only as much as it needs to fit.
//
//   cd <deck> && node <skill>/scripts/fit-slides.mjs [slides.md] [--port 3457] [--max 1] [--min 0.85] [--fill 0.9] [--dry]
//
// 1. Removes per-slide `class: text-sm` / `text-xs` and old `zoom:` (cover/section/intro/end
//    slides and the headmatter slide are left alone).
// 2. Opens every slide in its final click state with the deck's own Slidev + playwright-chromium
//    and measures how far the content reaches (absolute-positioned extras like <Credit> ignored).
// 3. Leaves every slide at zoom 1 unless it overflows; an overflowing slide shrinks just enough
//    (never below --min, default 0.85, so sizes stay consistent). Slides that still overflow at
//    --min are listed: split them (same words, same order). Sparse slides are NOT enlarged — a
//    deck whose text size jumps from slide to slide looks uneven; leave white space or add a
//    small picture instead. Words are never touched; only frontmatter changes.
// Edits slides.md in place through Slidev's own parser (round-trip safe); --dry only reports.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

const { values: a, positionals } = parseArgs({
  options: {
    port: { type: 'string', default: '3457' },
    max: { type: 'string', default: '1' }, // never enlarge: font size must look the same on every slide
    min: { type: 'string', default: '0.85' }, // shrink only a little; below this, split the slide
    fill: { type: 'string', default: '0.9' },
    dry: { type: 'boolean', default: false },
  },
  allowPositionals: true,
})
const entry = positionals[0] ?? 'slides.md'
const deck = process.cwd()
const bin = join(deck, 'node_modules', '.bin', 'slidev')
if (!existsSync(bin)) { console.error('error: run in the deck directory after `pnpm install`'); process.exit(2) }
const req = createRequire(join(deck, 'package.json'))
const { chromium } = req('playwright-chromium')
const cliReq = createRequire(req.resolve('@slidev/cli/package.json'))
const parserDir = dirname(cliReq.resolve('@slidev/parser/package.json'))
const { parseSync, stringify } = await import(pathToFileURL(join(parserDir, 'dist', 'core.mjs')))

const SKIP_LAYOUTS = new Set(['cover', 'section', 'intro', 'end', 'image', 'iframe'])
const MAX = +a.max; const MIN = +a.min; const FILL = +a.fill
const round = z => Math.round(z * 20) / 20 // 0.05 steps

function load() { return parseSync(readFileSync(entry, 'utf8'), entry) }
function save(md) { writeFileSync(entry, stringify(md)) }
// stringify() writes each slide's `raw` text, so rewrite the frontmatter block inside `raw`.
function setFm(slide, key, value) {
  const fm = { ...(slide.frontmatter ?? {}) }
  if (value === undefined) delete fm[key]; else fm[key] = value
  slide.frontmatter = fm
  let body = slide.raw
  const m = body.match(/^---\n[\s\S]*?\n---\n?/)
  if (m && slide.frontmatterRaw != null) body = body.slice(m[0].length)
  slide.frontmatterRaw = Object.entries(fm).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')
  slide.raw = Object.keys(fm).length ? `---\n${slide.frontmatterRaw}\n---\n${body.replace(/^\n?/, '\n')}` : body
  if (!Object.keys(fm).length) slide.frontmatterRaw = undefined
}

// ---- step 1: reset sizing (each slide i maps to rendered slide i+1)
const md = load()
const fit = [] // rendered numbers we manage
const keep = [] // slides with v-mark: stay at zoom 1
const noGrow = new Set()
md.slides.forEach((s, i) => {
  const layout = s.frontmatter?.layout
  if (i === 0 || SKIP_LAYOUTS.has(layout)) return
  const cls0 = String(s.frontmatter?.class ?? '')
  if (/v-mark/.test(s.content)) { // v-mark (rough-notation) is drawn in the wrong place under any zoom in PDF/PNG/PPTX export
    setFm(s, 'zoom', undefined)
    setFm(s, 'class', cls0.split(/\s+/).filter(c => c && !/^text-(xs|sm)$/.test(c)).join(' ') || undefined)
    keep.push(i + 1); return
  }
  fit.push(i + 1)
  if (/```mermaid/.test(s.content)) noGrow.add(i + 1) // Mermaid measures fine but renders wider when zoomed > 1
  const cls = String(s.frontmatter?.class ?? '').split(/\s+/).filter(c => c && !/^text-(xs|sm)$/.test(c)).join(' ')
  setFm(s, 'class', cls || undefined)
  setFm(s, 'zoom', undefined)
})
if (!a.dry) save(md)

// ---- step 2/3: measure in a browser
const url = `http://localhost:${a.port}`
const server = spawn(bin, [entry, '--port', a.port], { cwd: deck, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-server.pid) } catch {} }
process.on('exit', stop)
for (let i = 0; i < 120; i++) { try { if ((await fetch(url)).ok) break } catch {} await new Promise(r => setTimeout(r, 500)) }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
async function measure(n) {
  await page.goto(`${url}/${n}?clicks=999`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  return page.evaluate((n) => {
    const root = document.querySelector(`.slidev-page-${n}`)
    const box = root.getBoundingClientRect()
    let bottom = 0; let right = 0
    const positioned = el => { for (let e = el; e && e !== root; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'absolute' || p === 'fixed') return true } return false }
    for (const el of root.querySelectorAll('*')) { // everything: Mermaid draws outside its own div
      if (el.closest('.slidev-layout') !== null && el.classList.contains('slidev-layout')) continue
      if (positioned(el)) continue
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
      bottom = Math.max(bottom, r.bottom - box.top); right = Math.max(right, r.right - box.left)
    }
    return { h: box.height, w: box.width, bottom, right }
  }, n)
}

const zooms = {}
for (const n of fit) {
  const m = await measure(n)
  // Height decides: Slidev's zoom scales the slide and re-wraps text into the narrower
  // logical width, so width only matters for fixed-size things, which the re-measure catches.
  zooms[n] = round(Math.min(noGrow.has(n) ? 1 : MAX, Math.max(MIN, (FILL * m.h) / m.bottom)))
}
const apply = () => {
  const md2 = load()
  for (const n of fit) setFm(md2.slides[n - 1], 'zoom', Math.abs(zooms[n] - 1) < 0.001 ? undefined : zooms[n])
  if (!a.dry) save(md2)
}
apply()
// re-measure, step down anything that still overflows (zoom interacts with wrapping)
for (let pass = 0; pass < 6 && !a.dry; pass++) {
  await page.waitForTimeout(1500) // HMR
  let changed = false
  for (const n of fit) {
    const m = await measure(n)
    if (m.bottom > m.h * 0.98 || m.right > m.w * 0.99) { zooms[n] = round(Math.max(MIN, zooms[n] - 0.05)); changed = true }
  }
  if (!changed) break
  apply()
}
// v-mark slides can't zoom: if one overflows, shrink the font one step with class text-sm (no further)
for (const n of keep) {
  for (const cls of ['text-sm']) {
    if (a.dry) break
    const m = await measure(n)
    if (m.bottom <= m.h * 0.98 && m.right <= m.w * 0.99) break
    const md3 = load(); const sl = md3.slides[n - 1]
    const rest = String(sl.frontmatter?.class ?? '').split(/\s+/).filter(c => c && !/^text-(xs|sm)$/.test(c))
    setFm(sl, 'class', [...rest, cls].join(' ')); save(md3)
    console.log(`slide ${n}: class ${cls} (v-mark, no zoom)`)
    await page.waitForTimeout(1500)
  }
}
const tooBig = []
for (const n of [...fit, ...keep]) { if (a.dry) break; const m = await measure(n); if (m.bottom > m.h * 0.98 || m.right > m.w * 0.99) tooBig.push(n) }
await browser.close(); stop()
for (const n of fit) if (Math.abs(zooms[n] - 1) > 0.001) console.log(`slide ${n}: zoom ${zooms[n]}`)
if (tooBig.length) console.log(`still overflow at the smallest allowed size: ${tooBig.join(', ')} -> split these slides (same words, same order)`)
if (keep.length) console.log(`kept at zoom 1 (has v-mark): ${keep.join(', ')}. If one looks empty, add a small picture (§2b) instead of zooming.`)
console.log(`${a.dry ? '(dry run) ' : ''}fitted ${fit.length} slides`)
process.exit(0)
