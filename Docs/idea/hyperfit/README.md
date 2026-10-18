---
title: "HyperFit OS — idea track"
description: "R&D folder for a financial-grade workout and calorie ledger with fast logging and Apolyx strength charts"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - hyperfit
  - fitness
  - readme
---

# HyperFit OS

> Open this to grow the fitness ledger. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Life pillar:** fitness and health.

**Vault stage:** captured (phase 0). No app folder yet.

---

## Problem

Fitness apps are either paid and ad-heavy, or so slow that logging a meal takes a sitting. None of them treat training progress and daily discipline as one ledger you can audit.

## Concept

Look at training and food as a **financial ledger**: every set and every meal is a posted entry, calories and macros are the amounts, and progressive overload is the equity curve.

## Who it is for

You, logging your own training and food. A Telegram bot is a capture pipe into that ledger, not a second product.

## Core capabilities

- **Voice and photo calorie stream** — a short voice note to a Telegram bot, or one typed line (“200g chicken breast and a plate of rice”), written as calories and macros in Turso.
- **Progressive overload matrix** — strength and bodyweight charts in the same visual language as Artemis candles, built from Apolyx chart components.
- **Fast set logger** — posting one set takes under two seconds.

---

## Product phases

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | Text ledger | One typed line becomes a Turso meal row (kcal, protein, carbs, fat) you can list today | Turso client | new app surface, `cloud/hono-server`, `elements/base` |
| 2 | Two-second sets | Exercise, load, reps posted with almost no chrome; today’s session is a list of entries | Phase 1 shell | Apolyx forms |
| 3 | Telegram capture | The same meal parser accepts a Telegram text, then a voice transcript | Phase 1 parser | `cloud/` bot webhook |
| 4 | Photo capture | A meal photo becomes a draft row you confirm before it posts | Phase 1 | vision call behind Hono |
| 5 | Overload matrix | Charts of load over time and bodyweight, read-only, from the ledger | Phase 2 data | Apolyx charts |

Phases 3–5 are optional once 1 and 2 are a ledger you actually use.

## Monetization hypothesis

B2C subscription and a Telegram bot SaaS for people who already pay for food logging and hate the UI. Charge only after the text ledger and set logger are daily-driver fast.

## Stack synergy

Hono, Turso, Apolyx. No new database family.

## Open questions

1. App home: a route on `apps/web`, a new `apps/hyperfit`, or Telegram-only until phase 2?
2. Food parser: rules plus a small model, or a model only, and what do you store when the model is unsure?
3. Which lift family is the first overload chart (one barbell movement, or a whole session tonnage)?
4. Bodyweight entries: same ledger table as meals and sets, or a third entry type?

## When this track is chosen

Add a sharpening note with: the one-line meal grammar, the set fields (exercise, load, reps, and nothing else), where the app lives, and a Turso sketch for `entries`. Non-goals for that note: social feed, workout programs for sale, wearable sync.
