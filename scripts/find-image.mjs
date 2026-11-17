#!/usr/bin/env node
// find-image.mjs: get a picture for a slide topic and print a ready-to-paste <Credit> line.
//
//   Wikimedia Commons (default, free-licence real photos):
//     node find-image.mjs --query "Longshan Temple Taipei" --out public/photos/longshan.jpg
//     node find-image.mjs --query "Jiufen" --list            # show candidates, download nothing
//     node find-image.mjs --query "Jiufen" --pick 2 --out ... # take the 3rd candidate (0-based)
//
//   AI-generated (needs OPENAI_API_KEY or GEMINI_API_KEY; costs money):
//     node find-image.mjs --source ai --prompt "flat illustration of ..." --out public/photos/x.jpg
//
//   --source auto  : try Commons first, fall back to AI if nothing usable and a key is set.
//
// Every download is also recorded in --credits (default ./image-credits.json).
// Node >= 18, no npm dependencies.

import { parseArgs } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'

const UA = 'slidev-deck-skill/1.0 (https://github.com/ted-juan/slidev-deck-skill)'
const MAX_BYTES = 800 * 1024

const { values: a } = parseArgs({
  options: {
    query: { type: 'string' },
    prompt: { type: 'string' },
    out: { type: 'string' },
    source: { type: 'string', default: 'commons' }, // commons | ai | auto
    orientation: { type: 'string', default: 'any' }, // landscape | portrait | any
    width: { type: 'string', default: '1600' },
    'min-width': { type: 'string', default: '1000' },
    pick: { type: 'string', default: '0' },
    list: { type: 'boolean', default: false },
    limit: { type: 'string', default: '8' },
    credits: { type: 'string', default: 'image-credits.json' },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

if (a.help || (!a.query && !a.prompt)) {
  console.log(await readFile(new URL(import.meta.url), 'utf8').then(s => s.split('\n').filter(l => l.startsWith('//')).join('\n')))
  process.exit(a.help ? 0 : 2)
}

const stripHtml = s => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

// ------------------------------------------------------------------ Wikimedia Commons
async function commonsCandidates(query, width) {
  const u = new URL('https://commons.wikimedia.org/w/api.php')
  Object.entries({
    action: 'query', format: 'json', formatversion: '2',
    generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '30',
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(width),
  }).forEach(([k, v]) => u.searchParams.set(k, v))
  const r = await fetch(u, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`Commons API HTTP ${r.status}`)
  const pages = (await r.json()).query?.pages ?? []
  const minW = Number(a['min-width'])
  return pages
    .sort((x, y) => x.index - y.index) // search relevance order
    .map((p) => {
      const ii = p.imageinfo?.[0]; if (!ii) return null
      const m = ii.extmetadata ?? {}
      return {
        title: p.title.replace(/^File:/, ''),
        page: ii.descriptionurl,
        url: ii.thumburl ?? ii.url,
        width: ii.width, height: ii.height, mime: ii.mime,
        author: stripHtml(m.Artist?.value) || 'Unknown author',
        license: stripHtml(m.LicenseShortName?.value) || 'see file page',
        description: stripHtml(m.ImageDescription?.value).slice(0, 140),
      }
    })
    .filter(c => c && /image\/(jpeg|png|webp)/.test(c.mime) && c.width >= minW)
    .filter(c => a.orientation === 'any'
      || (a.orientation === 'landscape' ? c.width > c.height : c.height > c.width))
}

const commonsCredit = c => `${c.author} (${c.license}), via Wikimedia Commons`

async function download(url, out) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`download HTTP ${r.status}: ${url}`)
  const buf = Buffer.from(await r.arrayBuffer())
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, buf)
  return buf.length
}

async function fromCommons() {
  let width = Number(a.width)
  const list = await commonsCandidates(a.query, width)
  if (!list.length) return null
  if (a.list) {
    list.slice(0, Number(a.limit)).forEach((c, i) => console.log(
      `[${i}] ${c.title}  ${c.width}x${c.height}  ${c.license}  by ${c.author}\n    ${c.description}\n    ${c.page}`))
    process.exit(0)
  }
  const c = list[Number(a.pick)]
  if (!c) throw new Error(`--pick ${a.pick} out of range (${list.length} candidates)`)
  let bytes = await download(c.url, a.out)
  // Commons thumbnails are already JPEG-compressed; shrink the width if still too heavy.
  while (bytes > MAX_BYTES && width > 900) {
    width = Math.round(width * 0.75)
    const [again] = (await commonsCandidates(a.query, width)).filter(x => x.page === c.page)
    if (!again) break
    bytes = await download(again.url, a.out)
  }
  return { source: 'commons', out: a.out, bytes, title: c.title, page: c.page,
    author: c.author, license: c.license, credit: commonsCredit(c) }
}

// ------------------------------------------------------------------ AI generation
async function fromAI() {
  const prompt = a.prompt ?? `A clean, photographic-style illustration for a presentation slide about: ${a.query}. No text, no logos, no watermarks.`
  const ar = a.orientation === 'portrait' ? 'portrait' : 'landscape'
  let buf, model, ext
  if (process.env.OPENAI_API_KEY) {
    model = process.env.SLIDEV_IMAGE_MODEL ?? 'gpt-image-2'
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, n: 1, size: ar === 'portrait' ? '1024x1536' : '1536x1024',
        output_format: 'jpeg', output_compression: 80 }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${j.error?.message ?? JSON.stringify(j)}`)
    buf = Buffer.from(j.data[0].b64_json, 'base64'); ext = '.jpg'
  }
  else if (process.env.GEMINI_API_KEY) {
    model = process.env.SLIDEV_IMAGE_MODEL ?? 'gemini-2.5-flash-image'
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: ar === 'portrait' ? '9:16' : '16:9' } } }),
    })
    const j = await r.json()
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${j.error?.message ?? JSON.stringify(j)}`)
    const part = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
    if (!part) throw new Error('Gemini returned no image (blocked prompt?)')
    buf = Buffer.from(part.inlineData.data, 'base64')
    ext = part.inlineData.mimeType === 'image/jpeg' ? '.jpg' : '.png'
  }
  else {
    throw new Error('AI source needs OPENAI_API_KEY or GEMINI_API_KEY in the environment')
  }
  let out = a.out
  if (extname(out).toLowerCase() !== ext && !(ext === '.jpg' && /\.jpe?g$/i.test(out))) {
    out = out.slice(0, out.length - extname(out).length) + ext
    console.error(`note: provider returned ${ext}, saved as ${out}`)
  }
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, buf)
  if (buf.length > MAX_BYTES) console.error(`warning: ${out} is ${Math.round(buf.length / 1024)} KB; compress it before committing`)
  return { source: 'ai', out, bytes: buf.length, model, prompt, credit: `AI-generated image (${model})` }
}

// ------------------------------------------------------------------ main
try {
  if (!a.out && !a.list) throw new Error('--out is required (e.g. public/photos/x.jpg)')
  let res = null
  if (a.source !== 'ai') {
    if (!a.query) throw new Error('--query is required for Commons')
    res = await fromCommons()
    if (!res && a.source === 'commons') throw new Error(`no usable Commons image for "${a.query}"; try other keywords (English or local name), --orientation any, or --source ai`)
  }
  if (!res) res = await fromAI()

  let log = []
  try { log = JSON.parse(await readFile(a.credits, 'utf8')) } catch {}
  log = log.filter(e => e.out !== res.out).concat({ ...res, date: new Date().toISOString().slice(0, 10) })
  await writeFile(a.credits, `${JSON.stringify(log, null, 2)}\n`)

  console.log(JSON.stringify(res, null, 2))
}
catch (e) {
  console.error(`error: ${e.message}`)
  process.exit(1)
}
