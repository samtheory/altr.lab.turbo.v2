---
title: "Apolyx-S0012 — Magic UI reference wave"
feature_id: apolyx-F0015
description: "Maps Magic UI inspiration slugs to Apolyx names; S0012 implements gaps in batches (patterns, text, buttons, effects, chrome)"
created: 2026-11-25
updated: 2026-11-25
tags:
  - feature
  - ui-kit
  - apolyx
  - Apolyx-S0012
  - magic-ui
---

# Apolyx-S0012 — Magic UI reference wave

> Who: **apollo**. Intent: [[00-intent]]. Plan: [[../../plan/ui-kit/Apolyx-S0012/README]]. Prior: [[12-apolyx-s0011-agent-extras]].

## Goal

Use [Magic UI](https://magicui.design/) as **inspiration only** (no verbatim source). Ship missing presentational primitives with Apolyx tokens, `motion/react`, `useReducedMotion`, registry + `apps/apolyx` docs (`status: "new"` on **this wave only** — do not clear S0006–S0011 `new` badges).

## Batches (implementation order)

| Batch | Apolyx focus | Magic UI themes |
|-------|----------------|-----------------|
| B1 | `Pattern*` backgrounds | dot / hex / stripe / grid / ripple / rays / dither / particles |
| B2 | `Marquee`, text FX | marquee, typing, aurora, scramble, word cycle, … |
| B3 | Button ornaments | shimmer, ripple, pulse, magnet |
| B4 | Beams, borders, cards | beam-link, border-glow, shine-frame, spotlight |
| B5 | Lists, dock, bento | animated-list, dock, bento-grid |
| B6 | Device frames | browser / phone / android shells |
| B7 | Misc | file-tree, scroll-progress, social quote, maps, lens |

## Reference map

| Magic UI slug | Magic UI URL | Apolyx name | Status | Existing path | Notes |
|---------------|--------------|-------------|--------|---------------|-------|
| marquee | https://magicui.design/docs/components/marquee | `Marquee` | extend | `marquee-card.tsx` (card recipe) | Add generic infinite-scroll primitive |
| bento-grid | https://magicui.design/docs/components/bento-grid | `BentoGrid` | new | — | Masonry-style feature grid |
| animated-list | https://magicui.design/docs/components/animated-list | `RevealList` | new | `motion/stagger.tsx` (recipe) | List enter/exit choreography |
| dock | https://magicui.design/docs/components/dock | `DockBar` | new | — | Magnified icon dock |
| globe | https://magicui.design/docs/components/globe | `GlobeArcs` | exists | `globe-arcs.tsx` | Dotted globe + arcs |
| tweet-card | https://magicui.design/docs/components/tweet-card | `SocialQuoteCard` | new | `story-quote.tsx` (testimonial) | Generic social embed card |
| orbiting-circles | https://magicui.design/docs/components/orbiting-circles | `OrbitRing` | new | `stamp.tsx` (caption orbit) | Icon orbit decoration |
| lens | https://magicui.design/docs/components/lens | `MagnifyLens` | new | — | Hover magnifier |
| pointer | https://magicui.design/docs/components/pointer | `CursorGlow` | new | — | Custom cursor follower |
| progressive-blur | https://magicui.design/docs/components/progressive-blur | `EdgeFadeBlur` | new | — | Scroll edge fade masks |
| dotted-map | https://magicui.design/docs/components/dotted-map | `DotMap` | new | — | SVG world dot map |
| animated-beam | https://magicui.design/docs/components/animated-beam | `BeamLink` | new | — | SVG connector beam |
| border-beam | https://magicui.design/docs/components/border-beam | `BorderGlow` | new | — | Animated border trace |
| shine-border | https://magicui.design/docs/components/shine-border | `ShineFrame` | new | — | Conic shine frame |
| magic-card | https://magicui.design/docs/components/magic-card | `SpotlightCard` | new | `card.tsx` | Mouse-tracking spotlight |
| glare-hover | https://magicui.design/docs/components/glare-hover | `GlareSurface` | extend | `admit-pass.tsx` | Reusable glare overlay |
| meteors | https://magicui.design/docs/components/meteors | `MeteorShower` | new | — | Falling streak background |
| confetti | https://magicui.design/docs/components/confetti | `ConfettiBurst` | extend | `confetti-card.tsx` | Extract burst primitive |
| particles | https://magicui.design/docs/components/particles | `ParticleField` | new | — | Canvas/CSS particle layer |
| animated-theme-toggler | https://magicui.design/docs/components/animated-theme-toggler | `ThemeMorphToggle` | extend | `theme-toggle.tsx` | Animated icon morph |
| blur-fade | https://magicui.design/docs/components/blur-fade | `BlurFade` | extend | `motion/fade-in.tsx` | Blur + opacity entrance |
| text-animate | https://magicui.design/docs/components/text-animate | `TextMotion` | extend | `text-reveal.tsx` | Preset motion wrapper |
| typing-animation | https://magicui.design/docs/components/typing-animation | `TypewriterText` | new | `streaming-message.tsx` | Character typing |
| line-shadow-text | https://magicui.design/docs/components/line-shadow-text | `LineShadowText` | new | — | Offset line shadow type |
| aurora-text | https://magicui.design/docs/components/aurora-text | `AuroraText` | new | — | Gradient aurora fill |
| video-text | https://magicui.design/docs/components/video-text | `ClipVideoText` | new | `clip-video-text.tsx` | SVG mask + video; poster when reduced motion |
| number-ticker | https://magicui.design/docs/components/number-ticker | `NumberTicker` | new | `count-up-card.tsx` | Odometer digit column |
| animated-shiny-text | https://magicui.design/docs/components/animated-shiny-text | `ShimmerText` | new | — | Sheen across glyphs |
| animated-gradient-text | https://magicui.design/docs/components/animated-gradient-text | `GradientFlowText` | new | — | Moving gradient fill |
| text-reveal | https://magicui.design/docs/components/text-reveal | `TextReveal` | exists | `text-reveal.tsx` | |
| dia-text-reveal | https://magicui.design/docs/components/dia-text-reveal | `TextRevealDiagonal` | extend | `text-reveal.tsx` | Diagonal mask variant |
| hyper-text | https://magicui.design/docs/components/hyper-text | `ScrambleText` | new | — | Decode scramble |
| word-rotate | https://magicui.design/docs/components/word-rotate | `WordCycle` | new | blocks `hero-pill.tsx` | Cycling headline word |
| scroll-based-velocity | https://magicui.design/docs/components/scroll-based-velocity | `ScrollVelocityText` | new | — | Scroll-speed marquee text |
| sparkles-text | https://magicui.design/docs/components/sparkles-text | `SparkleText` | new | — | Sparkle particles on text |
| morphing-text | https://magicui.design/docs/components/morphing-text | `MorphText` | new | — | Crossfade between strings |
| spinning-text | https://magicui.design/docs/components/spinning-text | `SpinLabel` | new | — | Circular path label |
| highlighter | https://magicui.design/docs/components/highlighter | `TextHighlight` | exists | `text-highlight.tsx` | |
| text-3d-flip | https://magicui.design/docs/components/text-3d-flip | `FlipText` | exists | `flip-text.tsx` | |
| safari | https://magicui.design/docs/components/safari | `BrowserFrame` | new | — | Browser chrome shell |
| iphone | https://magicui.design/docs/components/iphone | `PhoneFrame` | new | — | iOS device shell |
| android | https://magicui.design/docs/components/android | `AndroidFrame` | new | — | Android device shell |
| rainbow-button | https://magicui.design/docs/components/rainbow-button | `Button` (`shine="rainbow"`) | exists | `button.tsx` | `variant="shiny"` |
| shimmer-button | https://magicui.design/docs/components/shimmer-button | `ShimmerButton` | new | — | Sliding sheen CTA |
| ripple-button | https://magicui.design/docs/components/ripple-button | `RippleButton` | new | — | Click ripple |
| flickering-grid | https://magicui.design/docs/components/flickering-grid | `PatternFlickerGrid` | new | B1 | Random cell flicker |
| animated-grid-pattern | https://magicui.design/docs/components/animated-grid-pattern | `PatternPulseGrid` | new | B1 | Traveling grid highlight |
| retro-grid | https://magicui.design/docs/components/retro-grid | `PatternRetroGrid` | new | B1 | Perspective floor grid |
| ripple | https://magicui.design/docs/components/ripple | `PatternRipple` | new | B1 | Concentric ripple rings |
| dot-pattern | https://magicui.design/docs/components/dot-pattern | `PatternDots` | new | B1 | SVG dot fill |
| hexagon-pattern | https://magicui.design/docs/components/hexagon-pattern | `PatternHex` | new | B1 | Honeycomb fill |
| striped-pattern | https://magicui.design/docs/components/striped-pattern | `PatternStripes` | new | B1 | Diagonal stripes |
| light-rays | https://magicui.design/docs/components/light-rays | `PatternLightRays` | new | B1 | Radial light beams |
| floating-3d-particles | https://magicui.design/docs/components/floating-3d-particles | `ParticleDrift` | new | `particle-drift.tsx` | 2D depth parallax canvas, not Three.js |
| dither-field | https://magicui.design/docs/components/dither-field | `PatternDither` | new | B1 | Ordered dither noise |
| shiny-button | https://magicui.design/docs/components/shiny-button | `Button` (`variant="shiny"`) | exists | `button.tsx` | |
| file-tree | https://magicui.design/docs/components/file-tree | `FileTree` | new | — | Collapsible tree |
| code-comparison | https://magicui.design/docs/components/code-comparison | `DiffViewer` | exists | `diff-viewer.tsx` | Side-by-side optional later |
| scroll-progress | https://magicui.design/docs/components/scroll-progress | `ScrollProgress` | new | — | Top/bottom scroll bar |
| neon-gradient-card | https://magicui.design/docs/components/neon-gradient-card | `GradientGlowCard` | new | — | Neon border card |
| comic-text | https://magicui.design/docs/components/comic-text | `ComicText` | new | — | Comic balloon type |
| kinetic-text | https://magicui.design/docs/components/kinetic-text | `KineticText` | new | — | Per-letter bounce |
| pixel-image | https://magicui.design/docs/components/pixel-image | `PixelReveal` | new | — | Pixelated reveal |
| pulsating-button | https://magicui.design/docs/components/pulsating-button | `PulseButton` | new | — | Breathing scale CTA |
| interactive-hover-button | https://magicui.design/docs/components/interactive-hover-button | `MagnetButton` | new | — | Magnetic hover |
| animated-circular-progress-bar | https://magicui.design/docs/components/animated-circular-progress-bar | `ProgressRing` | extend | `progress.tsx` | Circular determinate |
| backlight | https://magicui.design/docs/components/backlight | `BacklightPlate` | new | — | Rear glow plate |
| glyph-matrix | https://magicui.design/docs/components/glyph-matrix | `GlyphMatrix` | new | — | Matrix rain glyphs |

### Gap summary (plan)

| Status | Count |
|--------|------:|
| exists | 9 |
| extend | 10 |
| new | 48 |
| defer | 0 |

## Status

**done** (2026-11-25) — S0012 Magic UI wave **complete** (67/67 mapped; 0 defer). `ClipVideoText` + `ParticleDrift` shipped. Total **60 new kit exports** this sprint with registry, demos, MDX (`status: new` on S0012 only).

### Shipped in code (this pass)

`DockBar` · `RevealList` · `BrowserFrame` · `PhoneFrame` · `AndroidFrame` · `SocialQuoteCard` · `OrbitRing` · `MagnifyLens` · `CursorGlow` · `EdgeFadeBlur` · `DotMap` · `ShineFrame` · `SpotlightCard` · `GlareSurface` · `MeteorShower` · `GradientGlowCard` · `ConfettiBurst` · `ThemeMorphToggle` · `TextMotion` · `LineShadowText` · `GradientFlowText` · `ScrambleText` · `ScrollVelocityText` · `SparkleText` · `MorphText` · `SpinLabel` · `ComicText` · `KineticText` · `TextRevealDiagonal` · `FileTree` · `PixelReveal` · `PulseButton` · `MagnetButton` · `ProgressRing` · `BacklightPlate` · `GlyphMatrix` · `ClipVideoText` · `ParticleDrift`

### Shipped in code (prior pass)

`PatternDots` · `PatternHex` · `PatternStripes` · `PatternRetroGrid` · `PatternPulseGrid` · `PatternFlickerGrid` · `PatternRipple` · `PatternLightRays` · `PatternDither` · `ParticleField` · `Marquee` · `NumberTicker` · `WordCycle` · `AuroraText` · `ShimmerText` · `TypewriterText` · `BentoGrid` / `BentoItem` · `ScrollProgress` · `BeamLink` · `BorderGlow` · `ShimmerButton` · `RippleButton` · `BlurFade`