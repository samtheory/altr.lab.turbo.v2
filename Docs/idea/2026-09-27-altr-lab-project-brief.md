---
title: "altr.lab — project brief for AI ideation"
description: "Self-contained description of altr.lab.turbo.v2 (current state, stack, conventions) plus three idea tracks to brainstorm: ui-kit/design system, Artemis trading ecosystem, side projects"
created: 2026-09-27
updated: 2026-10-18
tags:
  - idea
  - brief
  - altr-lab
  - ui-kit
  - trading
  - artemis
---

# altr.lab — project brief for AI ideation

> **Repo update 2026-10-18:** the sample packages described below as current (`apps/hub`, `apps/dashboard`, `apps/trading-ui`, `apps/web`, `cloud/hono-server`, `cloud/ai-bot-agent`) were deleted. What remains is `apps/apolyx`, `cloud/pocketbase`, and `elements/`. Layout: [[../Altr.lab/structure]] · [[../tech_space/03-sample-apps-removed]]. The rest of this note is the 2026-09-27 brainstorm context.

> **To the AI reading this:** this document is the full context for a brainstorming session. You have no access to the repository, so everything you need is below. Read "Current state" carefully: a lot of the repo is still scaffolding, and your ideas should build on what really exists instead of assuming finished features. The format I want your answers in is at the end.

---

## 1. What altr.lab is

**altr.lab** is my personal product lab: a single TypeScript monorepo (`altr.lab.turbo.v2`) where I build a shared design system, shared backend utilities, and several apps on top of them. The goal is to write the reusable parts once (UI, database access, auth, AI helpers) and launch new products quickly on that shared base.

It has three main directions:

1. **A design system** (`@altr/ui-kit`) that every app uses and that I can also move into other projects.
2. **Artemis**, a trading bot ecosystem with a management platform (the `trading-ui` and `dashboard` apps plus backend services).
3. **Side projects**: small, useful, or profitable products built quickly on the same base.

---

## 2. Tech stack

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm workspaces |
| Language | TypeScript everywhere |
| Frontends | React 19, Next.js |
| Styling | Tailwind CSS v4, shadcn/ui (Radix-based), `class-variance-authority`, `tailwind-merge` |
| Animation | `motion` (the Framer Motion successor) |
| Theming | `next-themes` (light/dark via a `dark` class) |
| Icons | `lucide-react` |
| Component workshop | Storybook 9 (Vite builder, a11y + themes + docs addons) |
| API | Hono running on Bun |
| Primary database | **Turso / libSQL** (SQLite-compatible: a local file in dev, hosted in prod) |
| Optional backend | PocketBase for quick admin + auth side projects |
| Later, only if needed | Postgres (large-scale full-text search, JSONB, pgvector), Mongo |

**Why Turso:** zero infrastructure for side projects, one dashboard across all projects, a relational fit for trading data (positions, orders, signals), vector search via sqlite-vec when needed, and SQLite adapters in the AI tooling (LangChain, LlamaIndex, Vercel AI SDK).

---

## 3. Repository layout

```
altr.lab.turbo.v2/
├── apps/
│   ├── hub/            @altr/hub         landing site (Next.js, :3000), content from markdown files
│   ├── dashboard/      @altr/dashboard   admin UI (Next.js, :3001)
│   ├── trading-ui/     @altr/trading-ui  trading UI (Next.js, :3002)
│   └── web/            @altr/web         spare Next.js scaffold (:3003)
├── cloud/
│   ├── hono-server/    @altr/hono-server Hono + Bun API (:8787)
│   ├── pocketbase/     @altr/pocketbase  optional PocketBase (placeholder)
│   └── ai-bot-agent/   @altr/ai-bot-agent AI agent service (placeholder)
├── elements/
│   ├── ui-kit/         @altr/ui-kit      design system + Storybook (:6006)
│   └── base/           @altr/base        shared utils, content, db, env, errors, auth, ai
└── Docs/               Obsidian vault ("second brain"), described in section 5
```

All packages use the `@altr/*` scope. Every app imports `@altr/ui-kit/globals.css` and wraps itself in the ui-kit `ThemeProvider`.

---

## 4. Current state (honest snapshot, 2026-09-27)

### Built and working

- **Monorepo tooling:** Turborepo + pnpm workspaces across `apps/*`, `cloud/*`, `elements/*`.
- **`@altr/hub`:** a landing page that reads `content/*.md` files (frontmatter parsed with gray-matter) and renders them as stacked cards. Adding a page means dropping in a markdown file.
- **`@altr/ui-kit`:**
  - Design tokens as CSS variables in `globals.css` (HSL values, light and dark), mapped into Tailwind v4 through `@theme inline`: background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, a radius scale, and Geist Sans / Geist Mono fonts.
  - Components: `Button`, `Card`, `Badge` (shadcn), `ThemeProvider`, `ThemeToggle`, and one motion component, `FadeIn`.
  - Storybook 9 stories for all of the above.
- **`@altr/base`:** `utils` (`sleep`, `assert`, `slugify`, `Result`), `content` (markdown loaders), `env` (Turso env helpers), `errors` (`AltrError`, `NotFoundError`, …).
- **Docs vault** with an agent workflow (section 5).

### Scaffold or placeholder only

- `dashboard`, `trading-ui`, and `web` are empty Next.js shells with a single page each.
- `hono-server` only has `/` and `/health` endpoints.
- `ai-bot-agent` and `pocketbase` exist only as package placeholders.
- `@altr/base` `db`, `auth`, `query`, and `ai` are stubs.

### Known remaining work

- Wire Turso (`@libsql/client`) into `@altr/base/db`
- Implement auth
- Expand the shadcn component set
- CI pipeline (including a Storybook build)

**In short:** the foundation (monorepo, theming, Storybook, docs process) is in place. There is **no trading code, no bot logic, no auth, and no database wiring yet.** Treat Artemis as greenfield.

---

## 5. How I work (the pipeline your ideas feed into)

Docs live in an Obsidian vault under `Docs/`, and AI agents in Cursor maintain it. Every feature moves through the same stages:

```
idea → feature_list → plan → implement (code) → tech_space → report → brain
```

| Folder | Holds |
|--------|-------|
| `idea/` | Raw R&D notes like this one: messy and dated |
| `feature_list/` | Agreed product intent: *what* to build |
| `plan/` | Checkbox build plans: *next steps* |
| code | `apps/`, `cloud/`, `elements/` |
| `tech_space/` | As-built notes: *how* it was coded |
| `report/` | Audit of what's complete vs remaining |
| `brain/` | The living map of the whole vault |

When sources disagree, the order of truth is: **code > tech_space > report/plan > feature_list**.

**What this means for you:** your output becomes the input to `feature_list/`. Ideas that come split into clear, separately shippable features are the most useful to me.

---

## 6. Idea tracks to brainstorm

### Track 1 — ui-kit and design system

**Goal:** turn `@altr/ui-kit` into a real, portable design system: rich animated components, curated palettes and font sets, and **a token generator** so I can set up the same (or a re-themed) system in other projects, including ones outside this monorepo.

What I want to explore:

- **Animated components and an animation system:** motion primitives beyond `FadeIn` (stagger, reveal on scroll, layout/shared-element transitions, number tickers, text effects, hover/press micro-interactions), plus **motion tokens** (durations, easings, springs) and a reduced-motion policy.
- **Color palettes:** a set of named themes (for example a "trading dark" theme with profit/loss semantic colors), generated from a few seed colors, with contrast checks. Should I move from HSL to OKLCH?
- **Font sets:** curated heading/body/mono pairings as switchable presets, with a type scale.
- **Token generation for other projects:** one source of truth (JSON / W3C Design Tokens format?) that outputs Tailwind v4 `@theme` CSS, plain CSS variables, TypeScript constants, and maybe Figma variables. Possibly a CLI (`npx altr-tokens init`) or a shadcn-style registry so other projects can pull components.
- **Distribution:** stay monorepo-internal, publish to npm, or run a private shadcn registry?
- **Showcase:** Storybook exists already. Is a public docs site or theme playground worth building on `hub`?

Constraints: Tailwind v4, shadcn conventions, `motion`, React 19, Storybook 9. Keep it accessible, with a11y checks already running in Storybook.

### Track 2 — Artemis trading bot ecosystem

**Goal:** a trading bot ecosystem that **improves itself over time**, with a **UI platform** for managing bots, handling **deposits and withdrawals**, and **copy trading** on top of **Hyperliquid**, using **Hyperdash** and similar tools for trader discovery and analytics.

What I want to explore:

- **Bot architecture:** strategy runner, signal generation, execution, risk management (position limits, max drawdown, kill switch), backtesting and paper trading. Which parts live in `cloud/` (Bun/Hono workers, `ai-bot-agent`) and which in the apps?
- **Self-improvement loop:** how bots learn safely. Examples: performance tracking per strategy, automatic parameter tuning, AI-assisted strategy review, champion/challenger promotion (a new strategy version must beat the current one in paper trading before it gets real money). What guardrails stop a self-modifying bot from blowing up an account?
- **Management platform (`trading-ui` / `dashboard`):** bot list and status, start/stop, PnL and equity curves, positions and orders, logs and alerts, strategy configuration.
- **Deposits and withdrawals:** wallet connection, balances, and moving funds to and from bots. A key design question: **custodial vs non-custodial.** Hyperliquid supports API/agent wallets that can trade but cannot withdraw, and also has native vaults (a leader trades and depositors share PnL). Which model fits, for me alone at first and for other users later?
- **Copy trading:** discovering good traders (Hyperdash-style leaderboards and analytics; confirm which tools have public APIs), mirroring their positions with size scaling and risk caps, and handling latency, slippage, and leader drawdowns.
- **Data model on Turso:** accounts, wallets, bots, strategies, strategy versions, signals, orders, fills, positions, PnL snapshots, followed traders.
- **Phasing:** what's the smallest useful first version? (For example: a read-only dashboard of my own Hyperliquid account → paper-trading bot → one live bot with a kill switch → copy trading → multi-user.)

Please also cover, explicitly: security of keys and secrets, legal/regulatory exposure if other people's money is ever involved, and the failure modes to design for from day one.

### Track 3 — Side projects

**Goal:** a list of side projects worth adding to altr.lab: **genuinely useful utilities** or **high-profit income** ideas.

Selection criteria:

- Builds on the existing stack (Next.js + ui-kit + Hono/Bun + Turso or PocketBase) and reuses the shared packages
- One person can ship a first version in about 1–4 weeks
- Has a clear path to money (SaaS subscription, usage-based pricing, one-time purchase, affiliate, or selling templates/components) **or** directly strengthens Tracks 1 and 2
- Bonus: it reuses the ui-kit (for example, selling themes, templates, or animated components) or the trading data (alerts, analytics, trader scorecards)

For each idea, give: the problem, the target user, the monetization model, the smallest shippable version, which altr.lab packages it reuses, and rough effort.

---

## 7. What I want back from you

1. **For each track:** 5–10 concrete feature ideas, each with a one-line description, why it matters, rough effort (S/M/L), and dependencies on other features.
2. **A recommended order:** what to build first across all three tracks and why. (Hint: some shared foundations, like Turso wiring, auth, and the token system, unblock several tracks at once.)
3. **Open questions** I need to decide on (for example: custodial vs non-custodial, npm vs registry for the ui-kit).
4. **Risks** in each track, especially Artemis.
5. **Feature cards** for the top picks, written in this shape so they drop straight into `Docs/feature_list/`:

```markdown
---
title: "NN — <feature name>"
description: "<one line>"
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [feature, <track>]
---

# <feature name>

## Why
## What (scope)
## Out of scope
## Packages touched   (e.g. @altr/ui-kit, apps/trading-ui, cloud/hono-server)
## Acceptance criteria
## Open questions
```

Be concrete and opinionated. If something I've asked for is a bad idea (for example, taking custody of other people's funds without a license), say so plainly and suggest an alternative.
