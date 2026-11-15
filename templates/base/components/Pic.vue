<!-- 景點照片：圖片 + 左下角標籤。用 class 控制高度，例如 <Pic src="/photos/x.jpg" label="..." class="h-32" /> -->
<script setup lang="ts">
import { asset } from '../setup/asset'
defineProps<{ src: string, label?: string }>()
</script>

<template>
  <figure class="relative m-0 overflow-hidden rounded-lg shadow-md">
    <img :src="asset(src)" :alt="label" class="block w-full h-full object-cover">
    <figcaption v-if="label" class="absolute left-0 bottom-0 px-2 py-0.5 text-[10px] leading-tight text-white bg-black/55 rounded-tr-md">
      {{ label }}
    </figcaption>
  </figure>
</template>
