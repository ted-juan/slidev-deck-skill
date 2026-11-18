<!--
  Stagger — the direct children rise in one after another when the slide opens (agenda cards, icon rows).
  Wrap the grid/flex container's children, keep the container's classes on Stagger:
    <Stagger class="grid grid-cols-2 gap-4"> <Link…/> <Link…/> … </Stagger>
  Around a Markdown table, the table's body rows rise in instead (blank lines around the table):
    <Stagger>

    | a | b |
    |---|---|

    </Stagger>
  Final frame (exports, overview) = everything in place.
-->
<script setup lang="ts">
import { useMotion } from '../setup/motion'

withDefaults(defineProps<{ step?: number }>(), { step: 110 })
const { play } = useMotion()
</script>

<template>
  <div class="stagger motion" :class="{ go: play }" :style="{ '--step': `${step}ms` }">
    <slot />
  </div>
</template>

<style>
.stagger.go > :not(table), .stagger.go tbody > tr { animation: stagger-in .55s cubic-bezier(.22, 1, .36, 1) both; }
.stagger.go > :nth-child(2), .stagger.go tbody > tr:nth-child(2) { animation-delay: calc(var(--step) * 1); }
.stagger.go > :nth-child(3), .stagger.go tbody > tr:nth-child(3) { animation-delay: calc(var(--step) * 2); }
.stagger.go > :nth-child(4), .stagger.go tbody > tr:nth-child(4) { animation-delay: calc(var(--step) * 3); }
.stagger.go > :nth-child(5), .stagger.go tbody > tr:nth-child(5) { animation-delay: calc(var(--step) * 4); }
.stagger.go > :nth-child(6), .stagger.go tbody > tr:nth-child(6) { animation-delay: calc(var(--step) * 5); }
.stagger.go > :nth-child(7), .stagger.go tbody > tr:nth-child(7) { animation-delay: calc(var(--step) * 6); }
.stagger.go > :nth-child(8), .stagger.go tbody > tr:nth-child(8) { animation-delay: calc(var(--step) * 7); }
.stagger.go tbody > tr:nth-child(9) { animation-delay: calc(var(--step) * 8); }
.stagger.go tbody > tr:nth-child(10) { animation-delay: calc(var(--step) * 9); }
.stagger.go tbody > tr:nth-child(n+11) { animation-delay: calc(var(--step) * 10); }
@keyframes stagger-in {
  from { opacity: 0; transform: translateY(14px) scale(.97); }
  to { opacity: 1; transform: none; }
}
</style>
