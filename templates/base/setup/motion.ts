// Shared switch for the deck's micro-animations (CountUp, TypeIn, Particles, Pic motion, JourneyMap effects).
//   play  — true while this slide is on screen in the live deck or presenter view: start/run the animation.
//   still — PDF/PNG/PPTX export, overview grid, next-slide preview, or the viewer asked for reduced motion:
//           render the final (static) state instead, so exports never catch an animation half-way.
import { useIsSlideActive, useNav, useSlideContext } from '@slidev/client'
import { computed } from 'vue'

const reduced = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useMotion() {
  const active = useIsSlideActive()
  const { isPrintMode } = useNav()
  const { $renderContext } = useSlideContext()
  const still = computed(() => reduced || isPrintMode.value
    || !['slide', 'presenter'].includes($renderContext.value))
  const play = computed(() => active.value && !still.value)
  return { play, still }
}
