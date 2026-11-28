---
title: "Apolyx-S0013/S0014 — Aceternity reference wave"
feature_id: apolyx-F0016
description: "Maps Aceternity UI components and blocks to Apolyx names; S0013 ships primitives/effects, S0014 ships marketing blocks"
created: 2026-11-25
updated: 2026-11-28
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0013
  - Apolyx-S0014
  - aceternity
---

# Apolyx-S0013 / S0014 — Aceternity reference wave

> Who: **apollo**. Intent: [[00-intent]]. Plans: [[../../plan/ui-kit/Apolyx-S0013/README]] · [[../../plan/ui-kit/Apolyx-S0014/README]]. Prior: [[13-apolyx-s0012-magicui-wave]].

## Goal

Use [Aceternity UI](https://ui.aceternity.com/) as **inspiration only** (no verbatim source). Ship missing motion-heavy primitives and marketing blocks with Apolyx tokens, `motion/react`, `useReducedMotion`, registry + `apps/apolyx` docs (`status: "new"` on **this wave only** — do not clear earlier sprint `new` badges).

Taste: keep the animation energy and unique interaction; restyle with Apolyx semantics (no purple-on-white AI slop, no hard-coded Aceternity hex).

## Sprint split

| Sprint | Scope | Plan |
|--------|-------|------|
| **Apolyx-S0013** | Components / effects (~45) | [[../../plan/ui-kit/Apolyx-S0013/README]] |
| **Apolyx-S0014** | Blocks / sections (~25) | [[../../plan/ui-kit/Apolyx-S0014/README]] |

## Batches — S0013 (components)

| Batch | Apolyx focus | Aceternity themes |
|-------|----------------|-------------------|
| B1 | Background fields | cubes, boxes, gradient, wavy, vortex, lamp, sparkles, stars |
| B2 | Loaders | multi-step, image-generation |
| B3 | Nav chrome | floating navbar, navbar menu, sidebar |
| B4 | Pointer / border / glow | following-pointer, hover-border, glowing, spotlight-new |
| B5 | Cards / hover | direction-aware, card-hover, focus, evervault, expandable, 3d-pin, text-reveal-card |
| B6 | Scroll / media | sticky-scroll, container-scroll, parallax, images-slider, compare, layout-grid, tracing-beam |
| B7 | Canvas / mask / input | canvas-reveal, pixelated, svg-mask, layout-text-flip, vanish-input, link-preview |
| B8 | Docs / registry / verify | — |

## Batches — S0014 (blocks)

| Batch | Apolyx focus | Aceternity themes |
|-------|----------------|-------------------|
| B1 | Testimonials | photo carousels, highlight, marquee grid, drag, masonry |
| B2 | Team | cards, timeline cards, avatars, light bg, scales |
| B3 | Stats + feature card | grid stats, number ticker, animated feature card |
| B4 | FAQs + empty states | dashed, accordion, backdrop; pictures, cards, vertical grid |
| B5 | Navbar + text-anim blocks | dark shadow navbar; blur-fade, flipping words, typewriter blocks |
| B6 | Docs / registry / verify | — |

## Reference map — components

| Aceternity slug | Aceternity URL | Apolyx name | Status | Existing path | Notes |
|-----------------|----------------|-------------|--------|---------------|-------|
| background-cubes-grid | https://ui.aceternity.com/components/background-cubes-grid | `CubeField` | shipped | `cube-field.tsx` | Cursor-ripple 3D cube grid |
| background-boxes | https://ui.aceternity.com/components/background-boxes | `HoverBoxes` | shipped | `hover-boxes.tsx` | Interactive box field |
| background-gradient | https://ui.aceternity.com/components/background-gradient | `MeshGradient` | shipped | `mesh-gradient.tsx` | Animated mesh / aurora plate |
| wavy-background | https://ui.aceternity.com/components/wavy-background | `WaveField` | shipped | `wave-field.tsx` | Canvas/SVG wave BG |
| vortex | https://ui.aceternity.com/components/vortex | `VortexField` | shipped | `vortex-field.tsx` | Particle vortex BG |
| lamp-effect | https://ui.aceternity.com/components/lamp-effect | `LampGlow` | shipped | `lamp-glow.tsx` | Hero lamp wash |
| sparkles | https://ui.aceternity.com/components/sparkles | `SparkleField` | shipped | `sparkle-field.tsx` | Full sparkle canvas BG |
| shooting-stars-and-stars-background | https://ui.aceternity.com/components/shooting-stars-and-stars-background | `Starfield` | shipped | `starfield.tsx` | Stars + shooting streaks |
| meteors | https://ui.aceternity.com/components/meteors | `MeteorShower` | exists | `meteor-shower.tsx` | Map only |
| spotlight | https://ui.aceternity.com/components/spotlight | `SpotlightCard` | exists | `spotlight-card.tsx` | Map only |
| spotlight-new | https://ui.aceternity.com/components/spotlight-new | `SpotlightBeam` | shipped | `spotlight-beam.tsx` | Larger beam / page spotlight |
| glowing-effect | https://ui.aceternity.com/components/glowing-effect | `GlowFrame` | shipped | `glow-frame.tsx` | Unified glow frame API |
| hover-border-gradient | https://ui.aceternity.com/components/hover-border-gradient | `HoverBorder` | shipped | `hover-border.tsx` | Hover-driven gradient border |
| 3d-pin | https://ui.aceternity.com/components/3d-pin | `Pin3D` | shipped | `pin-3d.tsx` | Perspective pin / map marker |
| direction-aware-hover | https://ui.aceternity.com/components/direction-aware-hover | `DirectionHover` | shipped | `direction-hover.tsx` | Overlay slides from pointer edge |
| card-hover-effect | https://ui.aceternity.com/components/card-hover-effect | `HoverGrid` | shipped | `hover-grid.tsx` | Linked hover highlight grid |
| focus-cards | https://ui.aceternity.com/components/focus-cards | `FocusCards` | shipped | `focus-cards.tsx` | Sibling dim on hover |
| evervault-card | https://ui.aceternity.com/components/evervault-card | `CipherCard` | shipped | `cipher-card.tsx` | Encrypted hover matrix card |
| expandable-card | https://ui.aceternity.com/components/expandable-card | `ExpandCard` | shipped | `expand-card.tsx` | Layout-id expand |
| cards-free | https://ui.aceternity.com/components/cards-free | `CardPack` | shipped | `card-pack.tsx` | Free-floating card pack demos |
| text-reveal-card | https://ui.aceternity.com/components/text-reveal-card | `RevealCard` | shipped | `reveal-card.tsx` | Scratch / hover reveal card |
| layout-grid | https://ui.aceternity.com/components/layout-grid | `ExpandGrid` | shipped | `expand-grid.tsx` | Click-expand layout grid |
| canvas-reveal-effect | https://ui.aceternity.com/components/canvas-reveal-effect | `CanvasReveal` | shipped | `canvas-reveal.tsx` | Dot canvas reveal |
| pixelated-canvas | https://ui.aceternity.com/components/pixelated-canvas | `PixelCanvas` | shipped | `pixel-canvas.tsx` | Interactive pixel canvas |
| svg-mask-effect | https://ui.aceternity.com/components/svg-mask-effect | `SvgMask` | shipped | `svg-mask.tsx` | Cursor SVG mask reveal |
| sticky-scroll-reveal | https://ui.aceternity.com/components/sticky-scroll-reveal | `StickyScroll` | shipped | `sticky-scroll.tsx` | Sticky panel + scroll content |
| container-scroll-animation | https://ui.aceternity.com/components/container-scroll-animation | `ScrollHero` | shipped | `scroll-hero.tsx` | Device/hero scroll scale |
| parallax-scroll | https://ui.aceternity.com/components/parallax-scroll | `ParallaxGallery` | shipped | `parallax-gallery.tsx` | Multi-column parallax images |
| images-slider | https://ui.aceternity.com/components/images-slider | `ImageReel` | shipped | `image-reel.tsx` | Full-bleed image slider |
| compare | https://ui.aceternity.com/components/compare | `ImageCompare` | shipped | `image-compare.tsx` | Before/after image slider |
| tracing-beam | https://ui.aceternity.com/components/tracing-beam | `TraceBeam` | shipped | `trace-beam.tsx` | Scroll-linked vertical beam |
| following-pointer | https://ui.aceternity.com/components/following-pointer | `PointerFollow` | shipped | `pointer-follow.tsx` | Labeled / content cursor follow |
| floating-navbar | https://ui.aceternity.com/components/floating-navbar | `FloatNav` | shipped | `float-nav.tsx` | Scroll-hide floating bar |
| navbar-menu | https://ui.aceternity.com/components/navbar-menu | `MegaNav` | shipped | `mega-nav.tsx` | Hover mega-menu panels |
| sidebar | https://ui.aceternity.com/components/sidebar | `AppSidebar` | shipped | `app-sidebar.tsx` | Collapsible app sidebar kit |
| multi-step-loader | https://ui.aceternity.com/components/multi-step-loader | `StepLoader` | shipped | `step-loader.tsx` | Stepped loading states |
| image-generation-loader | https://ui.aceternity.com/components/image-generation-loader | `ForgeLoader` | shipped | `forge-loader.tsx` | Generative / forge progress loader |
| placeholders-and-vanish-input | https://ui.aceternity.com/components/placeholders-and-vanish-input | `VanishInput` | shipped | `vanish-input.tsx` | Placeholder cycle + vanish submit |
| link-preview | https://ui.aceternity.com/components/link-preview | `LinkPeek` | shipped | `link-peek.tsx` | Hover link preview card |
| file-upload | https://ui.aceternity.com/components/file-upload | `Dropzone` | exists | `dropzone.tsx` | Map only; taste polish later |
| timeline | https://ui.aceternity.com/components/timeline | `Timeline` | exists | `timeline.tsx` | Map only; sticky-story variant deferred |
| typewriter-effect | https://ui.aceternity.com/components/typewriter-effect | `TypewriterText` | exists | `typewriter-text.tsx` | Map only |
| flip-words | https://ui.aceternity.com/components/flip-words | `WordCycle` | exists | `word-cycle.tsx` | Map only |
| text-generate-effect | https://ui.aceternity.com/components/text-generate-effect | `GenerateText` | shipped | `generate-text.tsx` | Word blur-in generate |
| encrypted-text | https://ui.aceternity.com/components/encrypted-text | `CipherText` | shipped | `cipher-text.tsx` | Decode-on-view cipher |
| layout-text-flip | https://ui.aceternity.com/components/layout-text-flip | `LayoutFlip` | shipped | `layout-flip.tsx` | Layout-id word flip |
| animated-testimonials | https://ui.aceternity.com/components/animated-testimonials | `TestimonialReel` | shipped | `testimonial-reel.tsx` | Animated testimonial primitive |

## Reference map — blocks

| Aceternity slug | Aceternity URL | Apolyx name | Status | Existing path | Notes |
|-----------------|----------------|-------------|--------|---------------|-------|
| testimonials-photo-carousel-tall | https://ui.aceternity.com/blocks/testimonials/testimonials-photo-carousel-tall | `TestimonialCarouselTall` | shipped | `blocks/testimonial-carousel-tall.tsx` | Tall photo carousel block |
| testimonials-photo-carousel | https://ui.aceternity.com/blocks/testimonials/testimonials-photo-carousel | `TestimonialCarousel` | shipped | `blocks/testimonial-carousel.tsx` | Standard photo carousel |
| testimonials-with-centered-highlight | https://ui.aceternity.com/blocks/testimonials/testimonials-with-centered-highlight | `TestimonialHighlight` | shipped | `blocks/testimonial-highlight.tsx` | Centered quote highlight |
| testimonials-marquee-grid-boxed | https://ui.aceternity.com/blocks/testimonials/testimonials-marquee-grid-boxed | `TestimonialMarqueeGrid` | shipped | `blocks/testimonial-marquee-grid.tsx` | Boxed marquee grid |
| testimonials-background-with-drag | https://ui.aceternity.com/blocks/testimonials/testimonials-background-with-drag | `TestimonialDragBg` | shipped | `blocks/testimonial-drag-bg.tsx` | Draggable BG testimonials |
| testimonials-masonry-grid | https://ui.aceternity.com/blocks/testimonials/testimonials-masonry-grid | `TestimonialMasonry` | shipped | `blocks/testimonial-masonry.tsx` | Masonry quote grid |
| about-us-section-with-cards | https://ui.aceternity.com/blocks/team-sections/about-us-section-with-cards | `TeamAboutCards` | shipped | `blocks/team-about-cards.tsx` | About + team cards |
| team-section-with-timeline-cards | https://ui.aceternity.com/blocks/team-sections/team-section-with-timeline-cards | `TeamTimeline` | shipped | `blocks/team-timeline.tsx` | Team + timeline cards |
| team-section-with-small-avatars | https://ui.aceternity.com/blocks/team-sections/team-section-with-small-avatars | `TeamAvatars` | shipped | `blocks/team-avatars.tsx` | Compact avatar team |
| team-section-with-light-background | https://ui.aceternity.com/blocks/team-sections/team-section-with-light-background | `TeamLight` | shipped | `blocks/team-light.tsx` | Light-bg team section |
| team-section-with-scales | https://ui.aceternity.com/blocks/team-sections/team-section-with-scales | `TeamScales` | shipped | `blocks/team-scales.tsx` | Scale-on-hover team |
| stats-with-grid-background | https://ui.aceternity.com/blocks/stats-sections/stats-with-grid-background | `StatsGrid` | shipped | `blocks/stats-grid.tsx` | Stats over grid BG |
| stats-with-number-ticker | https://ui.aceternity.com/blocks/stats-sections/stats-with-number-ticker | `StatsTicker` | shipped | `blocks/stats-ticker.tsx` | Compose NumberTicker |
| feature-block-animated-card | https://ui.aceternity.com/blocks/cards/feature-block-animated-card | `FeatureMotionCard` | shipped | `blocks/feature-motion-card.tsx` | Animated feature card block |
| faqs-with-dashed-lines | https://ui.aceternity.com/blocks/faqs/faqs-with-dashed-lines | `FaqDashed` | shipped | `blocks/faq-dashed.tsx` | Dashed-line FAQ layout |
| frequently-asked-questions-with-accordion | https://ui.aceternity.com/blocks/faqs/frequently-asked-questions-with-accordion | `FaqAccordion` | shipped | `blocks/faq-accordion.tsx` | FAQ accordion section |
| simple-faqs-with-background | https://ui.aceternity.com/blocks/faqs/simple-faqs-with-background | `FaqBackdrop` | shipped | `blocks/faq-backdrop.tsx` | FAQ over decorative BG |
| empty-state-with-pictures | https://ui.aceternity.com/blocks/empty-states/empty-state-with-pictures | `EmptyGallery` | shipped | `blocks/empty-gallery.tsx` | Picture empty state |
| empty-state-with-cards | https://ui.aceternity.com/blocks/empty-states/empty-state-with-cards | `EmptyCards` | shipped | `blocks/empty-cards.tsx` | Card empty state |
| empty-state-vertical-grid | https://ui.aceternity.com/blocks/empty-states/empty-state-vertical-grid | `EmptyGrid` | shipped | `blocks/empty-grid.tsx` | Vertical grid empty |
| navbar-dark-shadow | https://ui.aceternity.com/blocks/navbars/navbar-dark-shadow | `NavbarShadow` | shipped | `blocks/navbar-shadow.tsx` | Dark shadow marketing navbar |
| text-animation-blur-fade-in | https://ui.aceternity.com/blocks/text-animations/text-animation-blur-fade-in | `TextBlurFadeBlock` | shipped | `blocks/text-blur-fade-block.tsx` | Section composing BlurFade |
| text-animation-flipping-words | https://ui.aceternity.com/blocks/text-animations/text-animation-flipping-words | `TextFlipBlock` | shipped | `blocks/text-flip-block.tsx` | Section composing flip words |
| text-animation-typewriter-effect | https://ui.aceternity.com/blocks/text-animations/text-animation-typewriter-effect | `TextTypewriterBlock` | shipped | `blocks/text-typewriter-block.tsx` | Section composing typewriter |

### Gap summary (plan)

| Status | Count |
|--------|------:|
| exists | 6 |
| extend | 0 |
| shipped | 65 |
| new | 0 |
| defer | 0 |

Totals: **71** mapped references (47 components + 24 blocks). **S0013** + **S0014** closed 2026-11-28. `apolyx-F0016` complete.

## Hard rules

1. Inspiration only — no paste of Aceternity source.
2. Semantic tokens; themes `default` | `power-blue` | `power-green` × light/dark.
3. `motion/react` + `useReducedMotion` on every animated surface.
4. Kit: `elements/ui-kit` · Docs: `apps/apolyx` · Registry JSON.
5. No Radix / Base UI.
6. Exists rows: ledger + optional light polish only when Aceternity behavior is clearly richer.

## Status

**closed** (2026-11-28) — **S0013** components + **S0014** marketing blocks fully shipped. Feature `apolyx-F0016` done.
