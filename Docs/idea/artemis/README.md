---
title: "Artemis Engine — idea track"
description: "R&D folder for the Artemis wealth engine: fast terminal, context copilot, and paper risk guard"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - artemis
  - trading
  - readme
---

# Artemis Engine

> Open this to grow the trading product. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Role:** crown jewel. The processing core for financial freedom inside altr.lab.

**Vault stage:** captured (phase 0). Promote only after a sharpening note.

---

## Status

| | |
|--|--|
| Idea folder | `idea/artemis/` |
| Intent | none yet under `feature_list/` |
| Code surfaces | Sample scaffolds removed 2026-10-18 ([[../../tech_space/03-sample-apps-removed]]). Shared code that remains: `elements/base`. A future terminal would be a new app. |
| As-built | no `tech_space` trading note. Treat product behavior as greenfield. |

Prior lens (Hyperliquid, copy trading, self-improving bots, custody): [[../2026-09-27-altr-lab-project-brief]] Track 2. This folder’s spine is the 2026-10-18 catalog. The older questions stay in [Deferred lane](#deferred-lane).

---

## Problem

Traders are stuck in slow terminals, opaque Telegram bots, or capital-management spreadsheets. Fundamental and sentiment reads drown in news. The missing piece is one fast surface that ties context to risk before any order exists.

## Concept

Three product surfaces, in this order:

1. **High-velocity terminal** — Apolyx UI, market data streamed through Bun/Hono.
2. **Context-aware copilot** — sentiment and news lined up against liquidity and the order book, retrieved with `sqlite-vec` on Turso.
3. **Execution and risk guard** — paper trading, automatic position size, and a risk-of-ruin figure before live capital is in scope.

## Who it is for

A single operator first: you, running a book and wanting the terminal, the context, and the risk math in one place. Multi-user copy trading and other people’s deposits stay out of the first product phases.

---

## Product phases

Build these only after promotion. Each phase is one shippable slice. Package names in the last column are intended future homes. Those sample folders are not in the repo.

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | Terminal shell | One symbol, streaming quotes, Apolyx layout that stays responsive while data moves | Apolyx app shell | `apps/trading-ui`, `elements/ui-kit`, `cloud/hono-server` |
| 2 | Risk guard (paper) | Position-size calculator and risk-of-ruin from inputs you type; paper fills stored in Turso; no live orders | Turso in `@altr/base` | `elements/base`, `apps/trading-ui` |
| 3 | Context copilot | One news or sentiment source attached to that symbol’s book, searchable with `sqlite-vec` | Phase 1 data on screen | `cloud/ai-bot-agent`, Turso |
| 4 | Paper execution loop | Copilot context and risk guard gate a paper order; a kill switch flattens the paper book | Phases 2 and 3 | `cloud/hono-server`, `apps/trading-ui` |

### Deferred lane

Held from the 2026-09-27 brief until phases 1–4 are real:

- Read-only Hyperliquid account view, then one live bot with a kill switch
- Champion/challenger strategy promotion (paper must beat the current version)
- Copy trading and Hyperdash-style discovery
- Deposits, withdrawals, and the custodial vs non-custodial choice
- Legal exposure if any other person’s money is involved

Security of keys is in scope the moment a live venue appears. It is not part of phases 1–4.

---

## Monetization hypothesis

Pro subscriptions, bot licensing, and profits from your own book. Licensing and subscriptions wait until the paper loop in phase 4 is something you trust daily.

## Open questions

1. Which single venue or data feed is the phase 1 stream (public crypto book, equities delayed, or a recorded fixture)?
2. Risk of ruin: which formula, and which inputs are required before the calculator is allowed to show a number?
3. Copilot corpus: which one source (a news RSS, X/Twitter, or a manual paste inbox) is enough for phase 3?
4. When the terminal is built, does an admin shell live in a separate app, or only in the trading app?

## When this track is chosen

Add `idea/artemis/YYYY-MM-DD-sharpen.md` that answers the four questions, names non-goals (no live orders, no custody, no copy trading), and sketches the Turso tables for paper positions. That note is the entrance to `feature_list/artemis/`.
