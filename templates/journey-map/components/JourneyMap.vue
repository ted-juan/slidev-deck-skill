<!--
  JourneyMap — animated route map for one day of an itinerary (regional map + timeline on the left).
  Usage: <JourneyMap :day="1" />, and set clicks = number of stops (= legs + 1) in that slide's frontmatter.
    click 0      : day overview (stops only)
    click 1..N-1 : camera flies to leg k; the vehicle moves along an arc and draws the route
    click N      : day overview (all routes)
  Basemap: Taiwan township boundaries from taiwan-atlas (MIT, Ministry of the Interior data),
  pre-projected into data/taiwan-map.json.
-->
<script setup lang="ts">
import { useSlideContext } from '@slidev/client'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import geo from '../data/taiwan-map.json'
import { journeys, modes, type Stop } from '../data/journeys'
import { asset } from '../setup/asset'

const props = withDefaults(defineProps<{ day: number, width?: number, height?: number }>(), {
  width: 600,
  height: 368,
})

const W = props.width
const H = props.height
const stops = computed<Stop[]>(() => journeys[props.day])
const legCount = computed(() => stops.value.length - 1)
const { $clicks } = useSlideContext()
const step = computed(() => Math.max(0, Math.min(legCount.value + 1, $clicks.value ?? 0)))

// ---------------------------------------------------------------- projection (must match how taiwan-map.json was projected; params in geo.proj)
const P = geo.proj
function proj(lon: number, lat: number): [number, number] {
  return [(lon - P.lon0) * P.cos * P.k, -(lat - P.lat0) * P.k]
}
const world = computed(() => stops.value.map(s => proj(s.lon, s.lat)))

// ---------------------------------------------------------------- camera
interface Cam { x: number, y: number, w: number, h: number }
function fit(pts: [number, number][], pad = 0.22, minW = 42): Cam {
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  let x0 = Math.min(...xs); let x1 = Math.max(...xs)
  let y0 = Math.min(...ys); let y1 = Math.max(...ys)
  let w = Math.max(x1 - x0, minW); let h = Math.max(y1 - y0, minW * H / W)
  if (w / h > W / H) h = w * H / W
  else w = h * W / H
  w *= 1 + pad * 2; h *= 1 + pad * 2
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2
  return { x: cx - w / 2, y: cy - h / 2, w, h }
}
function targetCam(s: number): Cam {
  if (s >= 1 && s <= legCount.value) return fit([world.value[s - 1], world.value[s]], 0.3)
  return fit(world.value, 0.3)
}

const cam = reactive<Cam>(targetCam(step.value))
const progress = ref(1) // drawing progress of the current leg (0..1)
const scale = computed(() => W / cam.w)
function toScreen([x, y]: [number, number]): [number, number] {
  return [(x - cam.x) * scale.value, (y - cam.y) * scale.value]
}

// ---------------------------------------------------------------- animation
let raf = 0
function tween(ms: number, fn: (t: number) => void): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      fn(t)
      if (t < 1) raf = requestAnimationFrame(tick)
      else resolve()
    }
    raf = requestAnimationFrame(tick)
  })
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
let run = 0
async function go(s: number, animate: boolean) {
  cancelAnimationFrame(raf)
  const id = ++run
  const to = targetCam(s)
  if (!animate) {
    Object.assign(cam, to)
    progress.value = 1
    return
  }
  const from = { ...cam }
  progress.value = 0
  await tween(900, (t) => {
    const e = ease(t)
    cam.x = from.x + (to.x - from.x) * e
    cam.y = from.y + (to.y - from.y) * e
    cam.w = from.w + (to.w - from.w) * e
    cam.h = from.h + (to.h - from.h) * e
  })
  if (id !== run) return
  await tween(1500, t => (progress.value = ease(t)))
}
watch(step, (s, prev) => go(s, s > prev && s <= legCount.value))
onMounted(() => go(step.value, false))
onBeforeUnmount(() => cancelAnimationFrame(raf))

// ---------------------------------------------------------------- legs (curved arcs in screen space)
function arc(a: [number, number], b: [number, number]) {
  const mx = (a[0] + b[0]) / 2; const my = (a[1] + b[1]) / 2
  const dx = b[0] - a[0]; const dy = b[1] - a[1]
  const k = 0.2 // bend; direction-dependent, so an out-and-back pair curves on opposite sides
  return { a, c: [mx - dy * k, my + dx * k] as [number, number], b }
}
function partial(q: ReturnType<typeof arc>, t: number) {
  // de Casteljau split of the quadratic at t → the drawn part + the point at t
  const lerp = (p: number[], r: number[], u: number): [number, number] => [p[0] + (r[0] - p[0]) * u, p[1] + (r[1] - p[1]) * u]
  const c1 = lerp(q.a, q.c, t)
  const end = lerp(c1, lerp(q.c, q.b, t), t)
  return { d: `M${q.a[0]},${q.a[1]}Q${c1[0]},${c1[1]} ${end[0]},${end[1]}`, end }
}
const legs = computed(() => {
  const out = []
  const s = step.value
  for (let i = 1; i <= legCount.value; i++) {
    const done = s > legCount.value || i < s
    const current = i === s
    if (!done && !current) continue
    const q = arc(toScreen(world.value[i - 1]), toScreen(world.value[i]))
    const t = current ? progress.value : 1
    const p = partial(q, Math.max(t, 0.001))
    const m = modes[stops.value[i].leg!.mode]
    out.push({ i, d: p.d, end: p.end, mode: stops.value[i].leg!.mode, color: m.color, current })
  }
  return out
})
const vehicle = computed(() => {
  const l = legs.value.find(l => l.current)
  if (!l) return null
  return { x: l.end[0], y: l.end[1], color: l.color, icon: modes[l.mode].icon }
})

// ---------------------------------------------------------------- markers & labels
const activeIndex = computed(() => (step.value >= 1 && step.value <= legCount.value ? step.value : -1))
const markers = computed(() => {
  const seen = new Map<string, number>()
  const list: { key: string, x: number, y: number, idx: number[] }[] = []
  stops.value.forEach((s, i) => {
    const key = `${s.lon},${s.lat}`
    if (seen.has(key)) { list[seen.get(key)!].idx.push(i); return }
    const [x, y] = toScreen(world.value[i])
    seen.set(key, list.length)
    list.push({ key, x, y, idx: [i] })
  })
  const visibleUpTo = step.value === 0 || step.value > legCount.value ? stops.value.length - 1 : step.value
  return list.map(m => ({
    ...m,
    reached: m.idx.some(i => i <= visibleUpTo),
    active: m.idx.includes(activeIndex.value) && progress.value > 0.98,
    inView: m.x > -20 && m.x < W + 20 && m.y > -20 && m.y < H + 20,
  }))
})
const labels = computed(() => {
  // active label first, then greedy: skip a label whose anchor is too close to one already placed
  const placed: [number, number][] = []
  const order = [...markers.value].sort((a, b) => Number(b.active) - Number(a.active))
  const out = []
  const flip = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' } as const
  for (const m of order) {
    if (!m.inView || !m.reached) continue
    if (placed.some(([x, y]) => Math.hypot(x - m.x, y - m.y) < 30)) continue
    placed.push([m.x, m.y])
    const first = stops.value[m.idx[0]]
    const time = m.idx.map(i => stops.value[i].time).join(' · ')
    // rough box size (px) → choose a side that fits, then clamp inside the map
    const w = Math.max(first.name.length * 5.6, time.length * 5.4) + 16
    const h = 30
    const box = (side: string) => side === 'right' ? [m.x + 12, m.y - h / 2]
      : side === 'left' ? [m.x - 12 - w, m.y - h / 2]
      : side === 'top' ? [m.x - w / 2, m.y - 12 - h] : [m.x - w / 2, m.y + 12]
    const fits = ([x, y]: number[]) => x >= 4 && y >= 4 && x + w <= W - 4 && y + h <= H - 4
    let side = first.side ?? 'right'
    if (!fits(box(side)) && fits(box(flip[side]))) side = flip[side]
    let [x, y] = box(side)
    x = Math.min(Math.max(x, 4), W - w - 4)
    y = Math.min(Math.max(y, 4), H - h - 4)
    out.push({ key: m.key, active: m.active, x, y, time, name: first.name })
  }
  return out
})

// ---------------------------------------------------------------- context: county names, scale bar, inset
const countyLabels = computed(() => geo.counties
  .map(c => ({ name: c.en, xy: toScreen([c.cx, c.cy]) }))
  .filter(c => c.xy[0] > 30 && c.xy[0] < W - 30 && c.xy[1] > 20 && c.xy[1] < H - 40)
  .filter((c, i, arr) => arr.findIndex(o => o.name === c.name) === i))
const scaleBar = computed(() => {
  const kmPerPx = 111.32 / P.k / scale.value
  const nice = [0.5, 1, 2, 5, 10, 20, 50, 100].find(k => k / kmPerPx >= 50) ?? 100
  return { km: nice, px: nice / kmPerPx }
})
const usedModes = computed(() => [...new Set(stops.value.slice(1).map(s => s.leg!.mode))].map(m => modes[m]))
const landTransform = computed(() => `translate(${-cam.x * scale.value},${-cam.y * scale.value}) scale(${scale.value})`)
</script>

<template>
  <div class="journey">
    <!-- timeline -->
    <ol class="tl">
      <template v-for="(s, i) in stops" :key="i">
        <li v-if="s.leg" class="tl-leg" :class="{ dim: step <= legCount && step < i }" :style="{ '--c': modes[s.leg.mode].color }">
          <span :class="modes[s.leg.mode].icon" />{{ s.leg.note }}
        </li>
        <li class="tl-stop" :class="{ on: activeIndex === i, dim: step <= legCount && step < i }">
          <img v-if="s.thumb" :src="asset(s.thumb)" alt="">
          <div>
            <div class="tl-time">{{ s.time }}</div>
            <div class="tl-name">{{ s.name }}</div>
          </div>
        </li>
      </template>
    </ol>

    <!-- map -->
    <div class="map" :style="{ width: `${W}px`, height: `${H}px` }">
      <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`">
        <rect :width="W" :height="H" class="sea" />
        <g :transform="landTransform">
          <path :d="geo.land" class="land" vector-effect="non-scaling-stroke" />
          <path :d="geo.towns" class="town" vector-effect="non-scaling-stroke" />
          <path v-for="c in geo.counties" :key="c.zh + c.cx" :d="c.d" class="county" vector-effect="non-scaling-stroke" />
        </g>
        <text v-for="c in countyLabels" :key="c.name" :x="c.xy[0]" :y="c.xy[1]" class="county-label">{{ c.name }}</text>

        <g v-for="l in legs" :key="l.i">
          <template v-if="l.mode === 'train'">
            <path :d="l.d" :stroke="l.color" stroke-width="6" class="leg" />
            <path :d="l.d" stroke="#fff" stroke-width="2" stroke-dasharray="3 5" class="leg" />
          </template>
          <path v-else-if="l.mode === 'walk'" :d="l.d" :stroke="l.color" stroke-width="4" stroke-dasharray="0.1 7" class="leg" />
          <template v-else>
            <path :d="l.d" stroke="#fff" stroke-width="7" class="leg" opacity="0.8" />
            <path :d="l.d" :stroke="l.color" stroke-width="3.5" class="leg" />
          </template>
        </g>
      </svg>

      <!-- stop markers -->
      <div
        v-for="m in markers" v-show="m.inView" :key="m.key" class="pin"
        :class="{ reached: m.reached, active: m.active }" :style="{ left: `${m.x}px`, top: `${m.y}px` }"
      />
      <!-- labels -->
      <div
        v-for="l in labels" :key="`l${l.key}`" class="tag" :class="{ active: l.active }"
        :style="{ left: `${l.x}px`, top: `${l.y}px` }"
      >
        <b>{{ l.time }}</b>{{ l.name }}
      </div>
      <!-- vehicle -->
      <div v-if="vehicle" class="vehicle" :style="{ left: `${vehicle.x}px`, top: `${vehicle.y}px`, background: vehicle.color }">
        <span :class="vehicle.icon" />
      </div>

      <!-- inset: where we are on the island -->
      <svg class="inset" viewBox="-820 -760 1880 3500" width="46" height="86">
        <path :d="geo.inset" class="inset-land" />
        <rect :x="cam.x" :y="cam.y" :width="cam.w" :height="cam.h" class="inset-cam" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- legend + scale -->
      <div class="legend">
        <div v-for="m in usedModes" :key="m.label"><i :style="{ background: m.color }" />{{ m.label }}</div>
        <div class="scale"><span :style="{ width: `${scaleBar.px}px` }" />{{ scaleBar.km }} km</div>
      </div>
      <div class="attrib">Boundaries: MOI NLSC (OGDL 1.0) via taiwan-atlas</div>
    </div>
  </div>
</template>

<style scoped>
.journey { display: flex; gap: 16px; align-items: flex-start; margin-top: 8px; }

/* ---- timeline ---- */
.tl { list-style: none; margin: 0 !important; padding: 0 !important; width: 232px; flex-shrink: 0; }
.tl li { margin: 0 !important; padding: 0 !important; list-style: none; transition: opacity .4s; }
.tl li::marker { content: none; }
.tl .dim { opacity: .3; }
.tl-stop { display: flex; gap: 8px; align-items: center; padding: 4px 6px !important; border-radius: 8px; }
.tl-stop img { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
.tl-stop.on { background: #fff7e6; box-shadow: inset 3px 0 0 #f59e0b; }
.tl-time { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: #92400e; line-height: 1.2; }
.tl-name { font-size: 13px; font-weight: 600; line-height: 1.2; }
.tl-leg { display: flex; align-items: center; gap: 6px; margin-left: 24px !important; padding: 3px 0 3px 12px !important;
  border-left: 2px dashed var(--c); color: var(--c); font-size: 10.5px; font-weight: 600; }

/* ---- map ---- */
.map { position: relative; overflow: hidden; border-radius: 14px; box-shadow: 0 6px 20px rgba(30, 41, 59, .15); flex-shrink: 0; }
.map svg { display: block; }
.sea { fill: #cfe3ee; }
.land { fill: #f6f1e3; stroke: #8fa9b8; stroke-width: 1.2; }
.town { fill: none; stroke: #e2d8c3; stroke-width: .6; }
.county { fill: none; stroke: #b9a888; stroke-width: 1; stroke-dasharray: 4 3; }
.county-label { font-size: 9px; letter-spacing: .18em; text-transform: uppercase; fill: #a08f6e; text-anchor: middle; font-weight: 600; }
.leg { fill: none; stroke-linecap: round; }

.pin { position: absolute; width: 12px; height: 12px; margin: -6px 0 0 -6px; transform: rotate(45deg);
  background: #fff; border: 2.5px solid #94a3b8; border-radius: 2px; transition: border-color .3s, transform .3s; }
.pin.reached { border-color: #1e293b; }
.pin.active { border-color: #f59e0b; background: #fde68a; transform: rotate(45deg) scale(1.45); }

.tag { position: absolute; white-space: nowrap; font-size: 10.5px; line-height: 1.25; padding: 3px 7px; border-radius: 5px;
  background: rgba(255, 255, 255, .92); color: #1e293b; box-shadow: 0 1px 4px rgba(0, 0, 0, .15); pointer-events: none; }
.tag b { display: block; font-size: 8.5px; letter-spacing: .08em; text-transform: uppercase; color: #92400e; font-weight: 600; }
.tag.active { background: #1e293b; color: #fff; }
.tag.active b { color: #fcd34d; }

.vehicle { position: absolute; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%; color: #fff;
  display: grid; place-items: center; font-size: 15px; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0, 0, 0, .3); }

.inset { position: absolute; top: 10px; right: 10px; background: rgba(255, 255, 255, .7); border-radius: 6px; padding: 3px; }
.inset-land { fill: #d6cdb6; }
.inset-cam { fill: rgba(245, 158, 11, .25); stroke: #d97706; stroke-width: 1.5; }

.legend { position: absolute; left: 10px; bottom: 10px; font-size: 9.5px; background: rgba(255, 255, 255, .85);
  padding: 5px 8px; border-radius: 6px; line-height: 1.5; color: #334155; }
.legend i { display: inline-block; width: 14px; height: 4px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
.scale { display: flex; align-items: center; gap: 5px; margin-top: 2px; }
.scale span { display: inline-block; height: 5px; border: 1.5px solid #334155; border-top: 0; }
.attrib { position: absolute; right: 6px; bottom: 3px; font-size: 7.5px; color: #64748b; }
</style>
