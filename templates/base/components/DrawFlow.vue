<!--
  DrawFlow — wrap a Mermaid flowchart: when the slide opens the boxes pop in left to right and
  every arrow draws itself, so the diagram "runs" once in the order it is read. No words added.
    <DrawFlow>

    ```mermaid {scale: 0.8}
    flowchart LR
      A ==> B ==> C
    ```

    </DrawFlow>
  Dotted links keep their dashes and only fade in. Final frame = the plain diagram.
  Slidev draws Mermaid inside a shadow root, so the CSS is injected there (page CSS can't reach it).
-->
<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useMotion } from '../setup/motion'

const props = withDefaults(defineProps<{ step?: number }>(), { step: 160 })
const { play } = useMotion()
const root = ref<HTMLElement>()

const CSS = (step: number) => {
  const delays = Array.from({ length: 7 }, (_, i) =>
    `svg.df-go .nodes > .node:nth-child(${i === 6 ? 'n+8' : i + 2}) { animation-delay: ${(i + 1) * step}ms; }`).join('\n')
  return `
svg.df-go .cluster { animation: df-fade .5s ease-out both; }
svg.df-go .nodes > .node { animation: df-pop .45s cubic-bezier(.34, 1.56, .64, 1) both; transform-box: fill-box; transform-origin: center; }
${delays}
svg.df-go .edgePaths > path:not(.edge-pattern-dotted):not(.edge-pattern-dashed) { stroke-dasharray: 1600; animation: df-draw 1.1s ease-in-out .25s both; }
svg.df-go .edgePaths > path.edge-pattern-dotted, svg.df-go .edgePaths > path.edge-pattern-dashed,
svg.df-go .edgeLabels > *, svg.df-go marker { animation: df-fade .5s ease-out .9s both; }
@keyframes df-pop { from { opacity: 0; scale: .6; } to { opacity: 1; scale: 1; } } /* scale, not transform: nodes are placed by their own transform=translate() */
@keyframes df-draw { from { stroke-dashoffset: 1600; } to { stroke-dashoffset: 0; } }
@keyframes df-fade { from { opacity: 0; } to { opacity: 1; } }`
}

let timer: ReturnType<typeof setTimeout> | undefined
function apply(on: boolean, tries = 0) {
  clearTimeout(timer)
  const svgs = [...(root.value?.querySelectorAll('.mermaid') ?? [])]
    .map(m => m.shadowRoot?.querySelector('svg')).filter(Boolean) as SVGSVGElement[]
  if (!svgs.length) { // Mermaid renders asynchronously: wait for it
    if (on && tries < 40) timer = setTimeout(() => apply(on, tries + 1), 50)
    return
  }
  for (const svg of svgs) {
    const sr = svg.getRootNode() as ShadowRoot
    if (!sr.querySelector('style[data-drawflow]')) {
      const st = document.createElement('style')
      st.dataset.drawflow = ''
      st.textContent = CSS(props.step)
      sr.appendChild(st)
    }
    svg.classList.toggle('df-go', on)
  }
}
watch(play, on => apply(on), { flush: 'post', immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div ref="root" class="draw-flow motion">
    <slot />
  </div>
</template>
