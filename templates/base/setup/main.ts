import { defineAppSetup } from '@slidev/types'
import { asset } from './asset'

// Lets slides.md use <img :src="$asset('/x.jpg')"> directly
export default defineAppSetup(({ app }) => {
  app.config.globalProperties.$asset = asset
})
