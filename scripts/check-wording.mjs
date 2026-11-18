#!/usr/bin/env node
// check-wording.mjs: prove the deck kept the speaker's words.
//
//   node <skill>/scripts/check-wording.mjs slides.original.md slides.md
//
// Splits the original draft into sentences / table cells and checks that each one
// appears in the deck (ignoring Markdown, HTML wrappers like <v-clicks>/<span v-mark>,
// spacing and punctuation-level markup), and in the same order.
// Also lists text the deck adds that is not in the draft (titles, labels, credits),
// so a human can confirm every addition. Exit 1 if anything is missing or reordered.

import { readFileSync } from 'node:fs'

const [origPath, deckPath] = process.argv.slice(2)
if (!origPath || !deckPath) { console.error('usage: check-wording.mjs <original.md> <slides.md>'); process.exit(2) }

// wrappers and motion components we add (their text content is the speaker's and is kept)
const OUR_TAGS = /<\/?(span|div|p|br|v-clicks|v-click|Credit|Pic|figure|figcaption|CountUp|TypeIn|Particles|SceneEffect|JourneyMap)\b[^>]*>/g
const norm = t => t
  .replace(OUR_TAGS, '')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> text
  .replace(/[*`#|\-\s]/g, '')
  .replace(/[：:]$/, '') // a heading may drop the trailing colon
const chunksOf = t => t.split(/[。；\n|]|(?<=：)/).map(c => c.replace(/^\s*#+\s*/, ''))
const meaningful = n => n.length >= 2 && !/^[:：]+$/.test(n)

const orig = readFileSync(origPath, 'utf8')
const deck = readFileSync(deckPath, 'utf8')

// Deck text a human wrote, minus slide config: frontmatter blocks, code fences we add (mermaid), image tags.
const deckProse = deck
  .replace(/^---\n[\s\S]*?\n---\n/, '\n') // headmatter
  .replace(/\n---\n(?:[a-zA-Z][\w-]*:.*\n)+---\n/g, '\n') // per-slide frontmatter
  .replace(/```mermaid[\s\S]*?```/g, '')
  .replace(/<(img|Pic|Particles|JourneyMap)\b[^>]*\/?>/g, '')

const D = norm(deck)
const O = norm(orig)
const missing = []; const reordered = []
let pos = 0
for (const c of chunksOf(orig)) {
  const n = norm(c)
  if (!meaningful(n)) continue
  if (!D.includes(n)) { missing.push(c.trim()); continue }
  if (n.length < 6 || D.indexOf(n) !== D.lastIndexOf(n)) continue // too short / ambiguous for order check
  const j = D.indexOf(n)
  if (j < pos) reordered.push(c.trim())
  pos = Math.max(pos, j)
}

const added = []
for (const c of chunksOf(deckProse)) {
  const n = norm(c)
  if (!meaningful(n) || /^(layout|class|background|title|transition|clicks|zoom):/.test(c.trim())) continue
  if (!O.includes(n)) added.push(c.replace(OUR_TAGS, '').trim())
}

const show = (label, list) => {
  console.log(`${label}: ${list.length}`)
  for (const x of list.slice(0, 40)) console.log(`   ${x.slice(0, 90)}`)
  if (list.length > 40) console.log(`   ... ${list.length - 40} more`)
}
show('MISSING from deck (must fix)', missing)
show('OUT OF ORDER (check: kicker/label moves are fine, content moves are not)', reordered)
show('ADDED by the deck (confirm each with the user)', [...new Set(added)])
process.exit(missing.length ? 1 : 0) // reorders are for review; missing words fail
