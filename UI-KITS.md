# UI Kit Resources for Apolyx / shadcn/ui Ecosystem

Reference list of modern React component libraries, registries, and design systems built on Tailwind CSS, shadcn/ui, and Motion/Framer Motion. Useful for inspiration, component patterns, and building Apolyx.

---

## Core Registries (shadcn/ui compatible)

| Name | URL | Description |
|------|-----|-------------|
| **shadcn/ui** | https://ui.shadcn.com/ | The foundation — composable, accessible components you own. Radix UI + Tailwind. |
| **Origin UI** | https://originui.com/ | Modern components built on Base UI (not Radix). 530+ particles. |
| **Kibo UI** | https://www.kibo-ui.com/ | Custom registry of 41 components, 28 blocks, 1101 patterns. Free, MIT. |
| **ReUI** | https://reui.io/ | Agent-ready layer for shadcn/ui. 1,264 free components, 678 pro blocks, MCP server. Endorsed by shadcn. |
| **Skiper UI** | https://skiper-ui.com/ | 106+ components, one-file each, no extra packages. `npx shadcn add @skiper-ui/skiper40` |
| **Cult UI** | https://www.cult-ui.com/ | 154 animated components, all free MIT. 58 new components recently added. |
| **Magic UI** | https://magicui.design/ | 150+ free animated components. Perfect shadcn/ui companion. Used by YC companies. |
| **MVPBlocks** | https://blocks.mvp-subha.me/ | Prebuilt UI blocks for MVPs. Next.js + Tailwind + Framer Motion. V0 compatible. |
| **Tailark** | https://tailark.com/ | Shadcn registry for marketing websites. Multiple styles, pages, illustrations. |
| **Kokonut UI** | https://kokonutui.com/ | 102 free components (React, Tailwind, Motion). Backed by Vercel OSS. Pro: 120+ components, 6 templates. |
| **Aceternity UI** | https://ui.aceternity.com/ | 200+ components, blocks, templates. React + Tailwind + Motion. MCP + AI agent ready. |
| **21st.dev** | https://21st.dev/ | Community components, templates, shaders, icons. AI-agent friendly (MCP, prompts). |
| **Preline UI** | https://preline.co/ | Open-source Tailwind CSS library. 640+ free components, 972 blocks, 22 templates. Universal framework support. |
| **Smooth UI** | https://smoothui.dev/ | 228 animated primitives/components. Motion + GSAP, React 19, Tailwind v4. shadcn compatible. AI-native (MCP, API). |

---

## Motion / Animation Focused

| Name | URL | Description |
|------|-----|-------------|
| **Motion Primitives** | https://motion-primitives.com/ | Beautiful animated UI kit. React + TypeScript + Tailwind + Motion. Open source. |
| **Smooth UI** | https://smoothui.dev/ | Motion-first primitives with spring physics, reduced-motion aware. |
| **Magic UI** | https://magicui.design/ | Animation-heavy components (border beam, comet, shimmer, etc.). |
| **Aceternity UI** | https://ui.aceternity.com/ | Heavy use of Motion for backgrounds, cards, text effects, 3D. |
| **Kokonut UI** | https://kokonutui.com/ | Motion-based interactions (detent dial, wheel picker, activity rings, etc.). |

---

## AI-Agent Ready (MCP / Skills / Prompts)

| Library | MCP Server | Agent Skills | AI Prompts |
|---------|------------|--------------|------------|
| **ReUI** | ✅ | ✅ | ✅ (per-block copy-paste) |
| **Smooth UI** | ✅ | ✅ | ✅ (UI Craft CLI) |
| **Aceternity UI** | ✅ | ✅ (Claude Code, Codex, Cursor) | ✅ |
| **21st.dev** | ✅ | ✅ | ✅ (per-component prompts) |
| **Preline UI** | ✅ | ✅ (npx skills add) | ✅ (per-block prompts) |
| **Kokonut UI** | ✅ | ✅ | ✅ |
| **Magic UI** | — | — | — |
| **shadcn/ui** | ✅ (official) | — | — |

---

## By Category

### Component Primitives (Radix/Base UI based)
- shadcn/ui
- Origin UI (Base UI)
- Kibo UI
- ReUI (free tier)
- Skiper UI
- Preline UI

### Marketing / Landing Page Blocks
- Aceternity UI (183+ blocks, 17 templates)
- Tailark (pages, sections, illustrations)
- Magic UI (templates in Pro)
- MVPBlocks
- 21st.dev (templates, themes)
- Kokonut UI Pro (heroes, templates)
- Preline UI (220+ free blocks, 22 templates)
- Smooth UI (4 hero, 3 pricing, 3 testimonial, 2 FAQ, 2 footer, 2 logo clouds, 2 stats, 2 team)

### Application / Dashboard UI
- ReUI (305 app blocks: auth, dashboard, kanban, data grid, charts, settings, etc.)
- Kibo UI (patterns for forms, roadmaps, collaborative canvas)
- Kokonut UI Pro (kanban, slash command, onboarding)
- Aceternity UI (AI chat, agent activity, AI usage)
- Preline UI (dashboard templates, framework guides)

### Data Visualization / Charts
- ReUI (area, bar, line, pie, radial, sankey, slope, sparkline, composed, status tracker)
- Kibo UI (roadmap/Gantt/calendar/kanban/table views)
- Magic UI (analytics chart component)
- Cult UI (analytics chart component)

### AI / Agent Interfaces
- ReUI (AI chat, agent activity, AI usage, agents)
- Kokonut UI (AI input selector, AI search, AI loading, AI voice, AI tool approval, AI context meter, AI citations, AI diff review, AI model selector, AI token alternatives, AI conversation branches, AI agent lanes, AI inline edit, AI message queue, AI redact, AI memory, AI autocomplete)
- Cult UI (AI SDK Agents integration, 58 new AI components)
- Aceternity UI (AI visibility landing page, inference landing page)
- 21st.dev (animated AI chat, AI input, AI voice input, AI loader, v0 AI chat)

### 3D / WebGL / Shaders
- Aceternity UI (3D card, 3D marquee, 3D globe, cloud shader, ribbon gradient shader, dither shader, liquid glass)
- 21st.dev (shaders category: 621, liquid metal, swirl, wave, dotted surface, wireframe globe)
- Smooth UI (dynamic island, phototab, scrollable card stack)
- Magic UI (border beam, comet, shimmer, globe)
- Kokonut UI (drape background, topo background, caustics, rain glass, halftone, ink)

---

## Installation Quick Reference

```bash
# shadcn/ui (official)
npx shadcn@latest init
npx shadcn@latest add button

# Origin UI
npx shadcn@latest add https://originui.com/r/button.json

# Kibo UI
npx kibo-ui add button

# ReUI
npx reui@latest add button

# Skiper UI
npx shadcn@latest add @skiper-ui/skiper40

# Cult UI
npx shadcn@latest add https://www.cult-ui.com/r/button.json

# Magic UI
npx shadcn@latest add https://magicui.design/r/button.json

# Preline UI
npm i preline

# Smooth UI
npx smoothui@latest add button

# Kokonut UI
npx shadcn@latest add https://kokonutui.com/r/button.json

# Aceternity UI
npx shadcn@latest add https://ui.aceternity.com/r/button.json

# 21st.dev
# Copy component code directly or use MCP

# MVPBlocks
# Copy-paste from docs

# Tailark
# Copy-paste from docs

# Motion Primitives
# Copy-paste from docs
```

---

## Design Philosophy Alignment with Apolyx

| Library | No Radix | Custom Tokens | Motion | Unique Taste | Notes |
|---------|----------|---------------|--------|--------------|-------|
| **Apolyx (target)** | ✅ | ✅ (3 themes) | ✅ (SVG+visx) | ✅ | Our kit |
| **shadcn/ui** | ❌ (Radix) | ✅ | ❌ | Baseline | Foundation |
| **Origin UI** | ✅ (Base UI) | ✅ | ❌ | Clean | Good reference |
| **ReUI** | ❌ (Radix) | ✅ | ✅ | Design-engineered | Pro blocks excellent |
| **Smooth UI** | ❌ (Radix) | ✅ (Tailwind v4) | ✅ (Motion+GSAP) | Motion-first | AI-native |
| **Magic UI** | ❌ (Radix) | ✅ | ✅ | Animated effects | Effects-heavy |
| **Aceternity UI** | ❌ (Radix) | ✅ | ✅ | Landing-focused | MCP ready |
| **Kokonut UI** | ❌ (Radix) | ✅ | ✅ | Interaction-rich | Vercel OSS backed |
| **Cult UI** | ❌ (Radix) | ✅ | ✅ | Component variety | AI SDK Agents funder |
| **Motion Primitives** | ❌ (Radix) | ✅ | ✅ | Motion showcase | Ibelick design |

---

## Recommended Study Order for Apolyx Development

1. **shadcn/ui** — patterns, CLI, registry structure
2. **Origin UI** — Base UI alternative, particle system
3. **ReUI** — agent-ready patterns, block architecture, MCP
4. **Smooth UI** — motion primitives, AI integration, Tailwind v4
5. **Aceternity UI** — block/template system, shader backgrounds
6. **Kokonut UI** — novel interaction patterns (detent dial, activity rings)
7. **Cult UI** — component variety, AI SDK integration
8. **Magic UI** — visual effects (border beam, shimmer, globe)
9. **Motion Primitives** — motion design reference
10. **21st.dev** — community patterns, shaders, templates
11. **MVPBlocks / Tailark / Preline** — marketing/application block patterns
12. **Skiper UI / Kibo UI** — niche components (color picker, QR, code block, roadmap)

---

## License Notes

| Library | License | Commercial Use |
|---------|---------|----------------|
| shadcn/ui | MIT | ✅ |
| Origin UI | MIT | ✅ |
| Kibo UI | MIT | ✅ |
| ReUI | Free: MIT / Pro: Paid | ✅ (Free) / License required (Pro) |
| Skiper UI | Free: MIT / Pro: Paid | ✅ (Free) / License required (Pro) |
| Cult UI | MIT | ✅ |
| Magic UI | MIT | ✅ |
| Aceternity UI | Free: MIT / Pro: Paid | ✅ (Free) / License required (Pro) |
| 21st.dev | Varies by author | Check per component |
| Preline UI | MIT | ✅ |
| Smooth UI | MIT | ✅ |
| Kokonut UI | Free: MIT / Pro: Paid | ✅ (Free) / License required (Pro) |
| MVPBlocks | BSD-3-Clause | ✅ |
| Tailark | Paid | License required |
| Motion Primitives | MIT | ✅ |

---

*Last updated: 2026-11-07*
*Use this as a living document — add new discoveries as you find them.*