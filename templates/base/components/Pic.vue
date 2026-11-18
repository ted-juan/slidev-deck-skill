<!--
  Photo card: image + bottom-left label. Set the height with class, e.g. <Pic src="/photos/x.jpg" label="..." class="h-32" />
  Optional motion while the slide is on screen (exports show the still photo):
    motion="kenburns"  slow zoom-in          motion="pan"  slow left→right pan (wide photos)
    motion="reveal"    wipes in from the left (diagrams, before/after)
-->
<script setup lang="ts">
import { asset } from '../setup/asset'
import { useMotion } from '../setup/motion'

defineProps<{ src: string, label?: string, motion?: 'kenburns' | 'pan' | 'reveal' }>()
const { play } = useMotion()
</script>

<template>
  <figure class="relative m-0 overflow-hidden rounded-lg shadow-md" :class="{ [`pic-${motion}`]: motion && play }">
    <img :src="asset(src)" :alt="label" class="block w-full h-full object-cover">
    <figcaption v-if="label" class="absolute left-0 bottom-0 px-2 py-0.5 text-[10px] leading-tight text-white bg-black/55 rounded-tr-md">
      {{ label }}
    </figcaption>
  </figure>
</template>

<style>
.pic-kenburns img { animation: pic-kenburns 9s ease-out forwards; transform-origin: 60% 40%; }
@keyframes pic-kenburns { from { transform: scale(1); } to { transform: scale(1.09); } }
.pic-pan img { animation: pic-pan 12s ease-in-out forwards; }
@keyframes pic-pan { from { object-position: 0% 50%; } to { object-position: 100% 50%; } }
.pic-reveal { animation: pic-reveal 1.1s cubic-bezier(.22, 1, .36, 1) both; }
@keyframes pic-reveal { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
</style>
