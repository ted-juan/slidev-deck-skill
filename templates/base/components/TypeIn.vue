<!--
  TypeIn — the wrapped text types itself in (with a blinking caret) when the slide appears.
  For one short line only: a cover subtitle, a quote, a command. Never for body text.
    <TypeIn>3-Day Northern to Central Taiwan Cultural Expedition</TypeIn>
  Exports show the full text.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMotion } from '../setup/motion'

const props = withDefaults(defineProps<{ speed?: number, delay?: number }>(), { speed: 28, delay: 400 })
const { play } = useMotion()
const ghost = ref<HTMLElement>()
const live = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

function stop() {
  clearTimeout(timer)
  live.value = null
}
function start() {
  stop()
  const text = ghost.value?.textContent ?? ''
  let n = 0
  live.value = ''
  const step = () => {
    live.value = text.slice(0, ++n)
    if (n < text.length) timer = setTimeout(step, props.speed)
    else timer = setTimeout(() => (live.value = null), 900)
  }
  timer = setTimeout(step, props.delay)
}
onMounted(() => play.value && start())
watch(play, p => (p ? start() : stop()))
onBeforeUnmount(stop)
</script>

<template>
  <span class="typein">
    <span ref="ghost" :style="{ visibility: live === null ? 'visible' : 'hidden' }"><slot /></span>
    <span v-if="live !== null" class="typein-live" aria-hidden="true">{{ live }}<i class="typein-caret" /></span>
  </span>
</template>

<style>
.typein { display: inline-grid; }
.typein > * { grid-area: 1 / 1; }
.typein-live { text-align: inherit; }
.typein-caret { display: inline-block; width: 2px; height: 1em; margin-left: 2px; vertical-align: -0.12em;
  background: currentColor; animation: typein-blink .8s steps(1) infinite; }
@keyframes typein-blink { 50% { opacity: 0; } }
</style>
