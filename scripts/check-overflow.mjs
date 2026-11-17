#!/usr/bin/env node
// check-overflow.mjs: find slides whose content runs off the slide edge.
//
//   cd <deck> && node <skill>/scripts/check-overflow.mjs [slides.md] [--port 3456]
//
// Starts the deck's own Slidev dev server, opens every slide in its final click
// state with the deck's playwright-chromium, and reports each element whose box
// extends past the slide's bottom or right edge (tables, long text, Mermaid SVGs).
// Exit code 1 if any slide overflows. Needs the deck's node_modules (pnpm install).

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values: a, positionals } = parseArgs({
  options: { port: { type: 'string', default: '3456' }, tolerance: { type: 'string', default: '2' } },
  allowPositionals: true,
})
const entry = positionals[0] ?? 'slides.md'
const deck = process.cwd()
const bin = join(deck, 'node_modules', '.bin', 'slidev')
if (!existsSync(bin)) { console.error('error: run this in the deck directory after `pnpm install`'); process.exit(2) }

let chromium
try { ({ chromium } = createRequire(join(deck, 'package.json'))('playwright-chromium')) }
catch { console.error('error: playwright-chromium not installed in the deck (pnpm add -D playwright-chromium)'); process.exit(2) }

const url = `http://localhost:${a.port}`
const server = spawn(bin, [entry, '--port', a.port], { cwd: deck, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-server.pid) } catch {} }
process.on('exit', stop)

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).ok) return } catch {}
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`dev server did not start on ${url}`)
}

let bad = 0
try {
  await waitUp()
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(`${url}/1`, { waitUntil: 'networkidle' })
  const total = await page.evaluate(() => window.__slidev__?.nav?.total ?? 0)
  const tol = Number(a.tolerance)
  for (let n = 1; n <= total; n++) {
    await page.goto(`${url}/${n}?clicks=999`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400) // Mermaid / fonts settle
    const over = await page.evaluate(({ n, tol }) => {
      const root = document.querySelector(`.slidev-page-${n}`)
      if (!root) return [{ what: 'slide not found', by: 0 }]
      const box = root.getBoundingClientRect()
      const hits = []
      for (const el of root.querySelectorAll('*')) { // everything: Mermaid draws outside its own div
        if (el.classList.contains('slidev-layout')) continue
        const r = el.getBoundingClientRect()
        if (!r.width || !r.height) continue
        const down = r.bottom - box.bottom; const right = r.right - box.right
        if (Math.max(down, right) > tol) hits.push({ el, by: Math.round(Math.max(down, right)), edge: down >= right ? 'bottom' : 'right' })
      }
      // report only the outermost offenders (a table, not each of its rows)
      return hits.filter(h => !hits.some(o => o !== h && o.el.contains(h.el))).slice(0, 4).map(h => ({
        by: h.by, edge: h.edge,
        what: `<${h.el.tagName.toLowerCase()}> ${(h.el.textContent || h.el.getAttribute('src') || '').replace(/\s+/g, ' ').trim().slice(0, 50)}`,
      }))
    }, { n, tol })
    if (over.length) {
      bad++
      const title = await page.evaluate(n => document.querySelector(`.slidev-page-${n} h2, .slidev-page-${n} h1`)?.textContent?.trim() ?? '', n)
      console.log(`slide ${n}  ${title}`)
      for (const o of over) console.log(`   ${o.by}px past ${o.edge ?? 'edge'}: ${o.what}`)
    }
  }
  await browser.close()
  console.log(bad ? `\n${bad} of ${total} slides overflow. Fix: zoom: 0.9 / 0.8 in the slide frontmatter, class: text-sm, move a wide diagram below the text, or split the slide.` : `all ${total} slides fit`)
}
catch (e) { console.error(`error: ${e.message}`); bad = -1 }
finally { stop() }
process.exit(bad ? 1 : 0)
