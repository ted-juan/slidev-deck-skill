---
theme: seriph
background: /photos/cover.jpg
class: text-center
title: __DECK_TITLE__
exportFilename: __DECK_SLUG__
transition: slide-left
# CJK text: Noto Sans TC (Traditional) / SC (Simplified) / JP. Latin font first, so English
# punctuation (’ “ ”) is not drawn full-width by the CJK font. Latin-only decks may drop the TC part.
fonts:
  sans: Noto Sans,Noto Sans TC
  serif: Noto Serif,Noto Serif TC
  mono: Fira Code
---

# __DECK_TITLE__

<p class="!opacity-95" style="text-shadow: 0 2px 10px rgba(0,0,0,.9)"><TypeIn>__SUBTITLE__</TypeIn></p>

**__AUTHOR_OR_TEAM__**

<Credit>
Cover: __PHOTO_TITLE__ — __AUTHOR__ (__LICENSE__), via Wikimedia Commons
</Credit>

---
class: text-sm
---

### __SECTION__ · __KICKER__

## __SLIDE_TITLE__

<div class="grid grid-cols-[1fr_230px] gap-6 mt-3">
<div>

<v-clicks>

- **__POINT_1__** — detail
- **__POINT_2__** — detail
- **__POINT_3__** — detail

</v-clicks>

> **Key number:** <span v-mark.underline.orange>__KEY_NUMBER__</span>

</div>
<div class="flex flex-col gap-2">
  <Pic src="/photos/a.jpg" label="__LABEL_A__" class="h-28" />
  <Pic src="/photos/b.jpg" label="__LABEL_B__" class="h-28" />
  <Pic src="/photos/c.jpg" label="__LABEL_C__" class="h-28" />
</div>
</div>

<Credit>
A: __AUTHOR__ (__LICENSE__) · B: __AUTHOR__ (__LICENSE__) · C: __AUTHOR__ (__LICENSE__) — via Wikimedia Commons
</Credit>

---

### __SECTION__ · __KICKER__

## __SLIDE_TITLE__

<img :src="$asset('/photos/feature.jpg')" class="h-72 mx-auto rounded-lg shadow-lg" />

*Photo / Taken by __WHO__*

---
layout: cover
background: /photos/closing.jpg
class: text-center
---

# Thank you

__CLOSING_LINE__

<div class="absolute bottom-6 left-6"><img :src="$asset('/qr.svg')" class="w-20 rounded bg-white p-1" /></div>

<Credit>
Background: __AUTHOR__ (__LICENSE__), via Wikimedia Commons
</Credit>
