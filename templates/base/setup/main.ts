import { defineAppSetup } from '@slidev/types'
import { asset } from './asset'

// 讓 slides.md 裡可以直接寫 <img :src="$asset('/x.jpg')">
export default defineAppSetup(({ app }) => {
  app.config.globalProperties.$asset = asset
})
