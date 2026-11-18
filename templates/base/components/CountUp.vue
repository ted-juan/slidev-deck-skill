<!--
  CountUp — numbers in the wrapped text count up from 0 when the slide appears, then the original text stays.
  The words live in slides.md unchanged, so check-wording still sees them:
    <CountUp>NT$ 1,531</CountUp>        <CountUp>~ NT$ 4,921 – 5,400</CountUp>       <CountUp :delay="600">87%</CountUp>
  Wrap only the number phrase (plain text; put bold/v-mark *outside*). Exports show the final text.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMotion } from '../setup/motion'

const props = withDefaults(defineProps<{ duration?: number, delay?: number }>(), { duration: 1400, delay: 250 })
const { play } = useMotion()
const ghost = ref<HTMLElement>()
const live = ref<string | null>(null)
let text = ''
let raf = 0
let timer: ReturnType<typeof setTimeout> | undefined

const NUM = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g
function frame(t: number) {
  return text.replace(NUM, (m) => {
    const dec = (m.split('.')[1] ?? '').length
    const v = Number.parseFloat(m.replace(/,/g, '')) * t
    return m.includes(',')
      ? v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : v.toFixed(dec)
  })
}
function stop() {
  cancelAnimationFrame(raf)
  clearTimeout(timer)
  live.value = null
}
function start() {
  stop()
  text = ghost.value?.textContent ?? ''
  if (!/\d/.test(text)) return
  live.value = frame(0)
  timer = setTimeout(() => {
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / props.duration)
      live.value = frame(1 - (1 - t) ** 3)
      if (t < 1) raf = requestAnimationFrame(tick)
      else live.value = null
    }
    raf = requestAnimationFrame(tick)
  }, props.delay)
}
onMounted(() => play.value && start())
watch(play, p => (p ? start() : stop()))
onBeforeUnmount(stop)
</script>

<template>
  <!-- the slot keeps the final width (no layout jump); the live number is drawn on top of it -->
  <span class="countup">
    <span ref="ghost" :style="{ visibility: live === null ? 'visible' : 'hidden' }"><slot /></span>
    <span v-if="live !== null" class="countup-live" aria-hidden="true">{{ live }}</span>
  </span>
</template>

<style>
.countup { display: inline-grid; font-variant-numeric: tabular-nums; }
.countup > * { grid-area: 1 / 1; }
.countup-live { white-space: nowrap; }
</style>
