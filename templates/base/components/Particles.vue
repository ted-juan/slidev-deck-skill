<!--
  Particles — small decorative things drifting over (part of) a slide. No words, pointer-events off.
  It fills its nearest positioned parent; give the parent `relative`, or pass a class:
    <Particles kind="lantern" />                                  sky lanterns rising (Shifen, festivals)
    <Particles kind="steam" class="absolute left-0 bottom-0 w-40 h-32" :count="4" />   steam over food
  kinds: lantern, steam, sparkle, petal, leaf, coin, bubble, snow, confetti, heart
  Runs only while the slide is on screen; exports show a frozen, scattered frame.
  Keep it subtle: few particles, away from body text (put it over a photo or an empty side).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useMotion } from '../setup/motion'

type Kind = 'lantern' | 'steam' | 'sparkle' | 'petal' | 'leaf' | 'coin' | 'bubble' | 'snow' | 'confetti' | 'heart'
const props = withDefaults(defineProps<{ kind: Kind, count?: number, seed?: number, speed?: number }>(), {
  count: 7, seed: 1, speed: 1,
})
const { play } = useMotion()

// dir: up / down / twinkle; dur: seconds per trip; size: px; spin: max rotation
const KINDS: Record<Kind, { dir: 'up' | 'down' | 'twinkle', dur: [number, number], size: [number, number], spin: number, colors: string[], svg: string }> = {
  lantern: { dir: 'up', dur: [9, 14], size: [16, 30], spin: 8, colors: ['#f59e0b', '#fb923c', '#facc15'],
    svg: '<path d="M4 3h12l2 17a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="currentColor"/><path d="M6 5h8l1 13H5z" fill="#fff7d6" opacity=".55"/><ellipse cx="10" cy="24.5" rx="2" ry="1.6" fill="#fde047"/>' },
  steam: { dir: 'up', dur: [3.5, 5.5], size: [16, 26], spin: 0, colors: ['#ffffff', '#e2e8f0'],
    svg: '<path d="M10 26C3 20 17 15 10 9 5 5 13 2 10 -1" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>' },
  sparkle: { dir: 'twinkle', dur: [1.6, 2.8], size: [10, 20], spin: 45, colors: ['#fde047', '#fbbf24', '#ffffff'],
    svg: '<path d="M10 0l2.2 7.8L20 10l-7.8 2.2L10 20l-2.2-7.8L0 10l7.8-2.2z" fill="currentColor"/>' },
  petal: { dir: 'down', dur: [7, 11], size: [10, 16], spin: 300, colors: ['#f9a8d4', '#fbcfe8', '#fda4af'],
    svg: '<path d="M10 1c6 5 6 13 0 18C4 14 4 6 10 1z" fill="currentColor"/>' },
  leaf: { dir: 'down', dur: [7, 11], size: [12, 20], spin: 260, colors: ['#84cc16', '#f59e0b', '#ea580c'],
    svg: '<path d="M3 17C3 7 9 2 18 2c0 9-5 15-15 15z" fill="currentColor"/><path d="M4 16L15 5" stroke="#fff" stroke-width="1" opacity=".5"/>' },
  coin: { dir: 'down', dur: [3.5, 5.5], size: [14, 22], spin: 0, colors: ['#fbbf24', '#facc15'],
    svg: '<circle cx="10" cy="10" r="9" fill="currentColor" stroke="#b45309" stroke-width="1.6"/><circle cx="10" cy="10" r="5.5" fill="none" stroke="#b45309" stroke-width="1.2" opacity=".7"/>' },
  bubble: { dir: 'up', dur: [5, 9], size: [10, 22], spin: 0, colors: ['#7dd3fc', '#bae6fd'],
    svg: '<circle cx="10" cy="10" r="8.5" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="7" r="2" fill="#fff" opacity=".8"/>' },
  snow: { dir: 'down', dur: [8, 13], size: [6, 12], spin: 0, colors: ['#ffffff'],
    svg: '<circle cx="10" cy="10" r="9" fill="currentColor"/>' },
  confetti: { dir: 'down', dur: [3.5, 6], size: [8, 12], spin: 720, colors: ['#f43f5e', '#3b82f6', '#22c55e', '#eab308', '#a855f7'],
    svg: '<rect x="3" y="6" width="14" height="8" rx="1" fill="currentColor"/>' },
  heart: { dir: 'up', dur: [5, 8], size: [12, 20], spin: 20, colors: ['#f43f5e', '#fb7185'],
    svg: '<path d="M10 18S2 12.5 2 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5.5-8 11-8 11z" fill="currentColor"/>' },
}

const k = computed(() => KINDS[props.kind])
const items = computed(() => {
  let s = props.seed * 9301 + 49297 // tiny deterministic PRNG: same layout on every render and in exports
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const lerp = ([a, b]: [number, number]) => a + (b - a) * rnd()
  return Array.from({ length: props.count }, (_, i) => {
    const dur = lerp(k.value.dur) / props.speed
    return {
      i,
      style: {
        'left': `${((i + 0.15 + rnd() * 0.7) / props.count) * 100}%`,
        'top': k.value.dir === 'twinkle' ? `${10 + rnd() * 75}%` : undefined,
        'width': `${lerp(k.value.size)}px`,
        'color': k.value.colors[Math.floor(rnd() * k.value.colors.length)],
        'animationDuration': `${dur}s`,
        'animationDelay': `${-rnd() * dur}s`, // negative: start mid-flight, so a frozen export frame is scattered
        '--dx': `${(rnd() - 0.5) * 60}px`,
        '--spin': `${(rnd() - 0.5) * 2 * k.value.spin}deg`,
      } as Record<string, string | undefined>,
    }
  })
})
</script>

<template>
  <div class="particles" :class="[`p-${k.dir}`, `p-kind-${kind}`, { paused: !play }]" aria-hidden="true">
    <svg
      v-for="p in items" :key="p.i" class="p" :style="p.style"
      :viewBox="kind === 'lantern' ? '0 0 20 27' : kind === 'steam' ? '0 -2 20 30' : '0 0 20 20'" v-html="k.svg"
    />
  </div>
</template>

<style>
.particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; container-type: size; z-index: 5; }
.particles .p { position: absolute; height: auto; animation-timing-function: linear; animation-iteration-count: infinite; }
.particles.paused .p { animation-play-state: paused; }
.p-up .p { bottom: -12%; animation-name: p-up; }
.p-down .p { top: -12%; animation-name: p-down; }
.p-twinkle .p { animation-name: p-twinkle; animation-timing-function: ease-in-out; }
.p-kind-lantern .p { filter: drop-shadow(0 0 6px rgba(251, 191, 36, .85)); }
.p-kind-steam .p { filter: blur(1.2px); }
@keyframes p-up {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; }
  12%, 80% { opacity: .9; }
  100% { transform: translate(var(--dx), -125cqh) rotate(var(--spin)); opacity: 0; }
}
.p-kind-steam .p { animation-name: p-steam; }
@keyframes p-steam {
  0% { transform: translate(0, 0) scale(.7); opacity: 0; }
  25% { opacity: .75; }
  100% { transform: translate(var(--dx), -60cqh) scale(1.4); opacity: 0; }
}
@keyframes p-down {
  0% { transform: translate(0, 0) rotate(0); opacity: 0; }
  10%, 85% { opacity: .9; }
  100% { transform: translate(var(--dx), 125cqh) rotate(var(--spin)); opacity: 0; }
}
@keyframes p-twinkle {
  0%, 100% { transform: scale(.3) rotate(0); opacity: .15; }
  50% { transform: scale(1) rotate(var(--spin)); opacity: 1; }
}
</style>
