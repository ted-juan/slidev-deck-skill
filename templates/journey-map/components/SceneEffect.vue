<!--
  SceneEffect — a small animation played on a JourneyMap scene card when the traveller arrives at a stop.
  Set it per stop in data/journeys.ts:  effect: 'jiaobei' | 'lanterns' | 'steam' | 'sparkle' | 'petals'
  and optionally effectLabel: '...' (a caption in the corner — it is added text, so confirm it with the speaker).
    jiaobei  : two moon blocks tossed and landing as 聖筊 (temples: Longshan, Tianhou, Mazu)
    lanterns : sky lanterns rising (Shifen, Pingxi, festivals)
    steam    : steam rising (night markets, food stalls, hot springs)
    sparkle  : twinkles (viewpoints, night views, "arrived!")
    petals   : falling blossoms (gardens, cherry blossoms, parks)
  Add a new effect the same way: one more v-if block + its CSS, or reuse <Particles kind="..." />.
-->
<script setup lang="ts">
defineProps<{ name: string, label?: string }>()
</script>

<template>
  <Particles v-if="name === 'lanterns'" kind="lantern" :count="8" :speed="1.6" />
  <Particles v-else-if="name === 'steam'" kind="steam" :count="6" class="steam-zone" />
  <Particles v-else-if="name === 'sparkle'" kind="sparkle" :count="9" />
  <Particles v-else-if="name === 'petals'" kind="petal" :count="10" :speed="1.4" />

  <div v-if="name === 'jiaobei' || label" class="fx-box">
    <svg v-if="name === 'jiaobei'" viewBox="0 0 120 76" width="110" height="70">
      <ellipse cx="38" cy="64" rx="18" ry="4" fill="rgba(0,0,0,0.35)" />
      <ellipse cx="82" cy="64" rx="18" ry="4" fill="rgba(0,0,0,0.35)" />
      <!-- left block: flat side up (light inner wood) -->
      <g class="block-left">
        <path d="M18,56 C22,40 46,38 54,54 C44,58 28,60 18,56 Z" fill="#fca5a5" stroke="#991b1b" stroke-width="2" />
        <path d="M22,55 C28,45 42,44 50,53" fill="none" stroke="#fef2f2" stroke-width="1.5" stroke-linecap="round" />
      </g>
      <!-- right block: curved side up (deep red) — one up, one down = 聖筊, a "yes" -->
      <g class="block-right">
        <path d="M66,54 C74,38 98,40 102,56 C92,60 76,58 66,54 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" />
        <path d="M72,49 C80,43 90,44 96,50" fill="none" stroke="#f87171" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <circle cx="60" cy="24" r="2.2" fill="#fde047" class="spark" />
      <circle cx="44" cy="18" r="1.6" fill="#fde047" class="spark s2" />
      <circle cx="76" cy="20" r="1.8" fill="#fde047" class="spark s3" />
    </svg>
    <div v-if="label" class="fx-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.steam-zone { inset: auto 0 0 0 !important; height: 60% !important; }
.fx-box { position: absolute; right: 12px; bottom: 12px; padding: 8px 12px; border-radius: 10px; z-index: 6;
  background: rgba(15, 23, 42, .82); border: 1px solid rgba(251, 191, 36, .45); backdrop-filter: blur(6px);
  display: flex; flex-direction: column; align-items: center; gap: 2px; }
.fx-label { font-size: 10px; color: #fef3c7; white-space: nowrap; }
.block-left { transform-origin: 36px 52px; animation: toss-left 1.3s cubic-bezier(.22,1,.36,1) forwards; }
.block-right { transform-origin: 84px 52px; animation: toss-right 1.3s cubic-bezier(.22,1,.36,1) forwards; }
@keyframes toss-left {
  0% { transform: translateY(-28px) rotate(-140deg) scale(.85); opacity: 0; }
  45% { transform: translateY(-34px) rotate(40deg) scale(1.05); opacity: 1; }
  75% { transform: translateY(2px) rotate(-8deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
@keyframes toss-right {
  0% { transform: translateY(-32px) rotate(160deg) scale(.85); opacity: 0; }
  50% { transform: translateY(-36px) rotate(-35deg) scale(1.05); opacity: 1; }
  78% { transform: translateY(2px) rotate(8deg); }
  100% { transform: translateY(0) rotate(0deg); }
}
.spark { opacity: 0; animation: pop-spark .8s ease-out 1.1s forwards; }
.s2 { animation-delay: 1.2s; }
.s3 { animation-delay: 1.3s; }
@keyframes pop-spark {
  0% { opacity: 0; transform: scale(0); }
  60% { opacity: 1; transform: scale(1.3); }
  100% { opacity: .9; transform: scale(1); }
}
</style>
