#!/usr/bin/env node
// check-motion.mjs: see the micro-animations actually move (exports only ever show the final frame).
//
//   cd <deck> && node <skill>/scripts/check-motion.mjs [slides.md] [--port 3457] [--out shots-motion]
//
// Starts the deck's dev server, finds every slide that uses a motion component (CountUp, TypeIn,
// Particles, <Pic motion=…>, JourneyMap, or a custom one marked with class "motion"), and saves two
// screenshots per slide: ~0.6 s after it opens (animation running) and ~3 s later (settled).
// JourneyMap slides are also stepped through their clicks (one shot per click, after the camera lands).
// Also prints page errors. Open the PNGs: the "a" shot must differ from "b", nothing may cover text.

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'

const { values: a, positionals } = parseArgs({
  options: { port: { type: 'string', default: '3457' }, out: { type: 'string', default: 'shots-motion' } },
  allowPositionals: true,
})
const entry = positionals[0] ?? 'slides.md'
const deck = process.cwd()
const bin = join(deck, 'node_modules', '.bin', 'slidev')
if (!existsSync(bin)) { console.error('error: run this in the deck directory after `pnpm install`'); process.exit(2) }
const { chromium } = createRequire(join(deck, 'package.json'))('playwright-chromium')

const url = `http://localhost:${a.port}`
const server = spawn(bin, [entry, '--port', a.port], { cwd: deck, stdio: 'ignore', detached: true })
const stop = () => { try { process.kill(-server.pid) } catch {} }
process.on('exit', stop)
for (let i = 0; i < 120; i++) {
  try { if ((await fetch(url)).ok) break } catch {}
  await new Promise(r => setTimeout(r, 500))
}

mkdirSync(a.out, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []
page.on('pageerror', e => { if (!/Wake Lock/.test(e.message)) errors.push(e.message) })
await page.goto(`${url}/1`, { waitUntil: 'networkidle' })
const total = await page.evaluate(() => window.__slidev__?.nav?.total ?? 0)
const SEL = '.countup, .typein, .particles, [class*="pic-"], figure img, .journey, .motion'
let found = 0
for (let n = 1; n <= total; n++) {
  await page.goto(`${url}/${n}`, { waitUntil: 'networkidle' })
  const kind = await page.evaluate(({ n, SEL }) => {
    const root = document.querySelector(`.slidev-page-${n}`)
    if (!root) return null
    if (root.querySelector('.journey')) return 'map'
    const hit = [...root.querySelectorAll(SEL)].some(el => !el.matches('figure img') || el.closest('figure')?.className.includes('pic-'))
    return hit ? 'motion' : null
  }, { n, SEL })
  if (!kind) continue
  found++
  if (kind === 'map') {
    const clicks = await page.evaluate(() => window.__slidev__?.nav?.clicksTotal ?? 0)
    for (let c = 1; c <= clicks; c++) {
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(c === 1 ? 1600 : 3600)
      await page.screenshot({ path: join(a.out, `${n}-click${c}.png`) })
    }
    console.log(`slide ${n}: JourneyMap, ${clicks} clicks`)
  }
  else {
    await page.goto(`${url}/${n}`) // fresh entry so the animation restarts
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(a.out, `${n}-a.png`) })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: join(a.out, `${n}-b.png`) })
    console.log(`slide ${n}: motion`)
  }
}
await browser.close()
console.log(found ? `\n${found} animated slides → ${a.out}/` : 'no animated slides found')
if (errors.length) { console.log('\npage errors:'); for (const e of [...new Set(errors)]) console.log('  ' + e); process.exitCode = 1 }
