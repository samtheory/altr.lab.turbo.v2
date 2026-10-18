---
title: "ForgeRealm / CardCraft — idea track"
description: "R&D folder for a three-phase card game: inventory and merge, then a guild exchange, then a web arena"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - forge-realm
  - cardcraft
  - games
  - readme
---

# ForgeRealm / CardCraft

> Open this to grow the card game. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Life pillar:** video games and a player-driven digital economy.

**Working names:** ForgeRealm (world) and CardCraft (the craft loop). Pick one public name in the sharpening note.

**Vault stage:** captured (phase 0). No `apps/card-forge` yet. `apps/web` is a spare Next scaffold if you want a home before a new app.

---

## Target

One game in three layers: **merge mechanic**, **deck collection**, **player-driven exchange**. Web first. A realtime arena only after the inventory is fun with no opponent.

## Economic constraints

These are design rules for every later phase.

- **No speculative token.** Assets are crafted cards, skins, and distinct roles. There is no coin whose value depends on new buyers.
- **Merge and sink.** Growing a card or unlocking a theme burns or merges items, so the market cannot fill with infinite copies.
- **Skill and craft over pay-to-win.** Money buys personalization tools, Apolyx skins, and a shorter merge timer. It does not buy a win in the arena.

---

## Product phases

The catalog’s three layers, with phase 1 split so the first build has no market and no combat.

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1a | Collection | A grid of cards you own. Glass cards, Apolyx, motion on hover and merge preview. Static data is enough | Apolyx | `apps/web` or `apps/card-forge` |
| 1b | Merge | Two cards combine by a written rule; inputs are consumed; the result is stored | 1a | client state, then Turso |
| 1c | Activity loot | A server draw (secure RNG) grants a card from a table; opening it is the only random moment | 1b, Hono | `cloud/hono-server`, `elements/base` |
| 2 | Guild exchange | Peer listing of a limited card, a small platform fee, Turso as the trade log | 1c inventory | Hono, Turso. Price idea: reuse Artemis ledger habits, not the trading terminal |
| 3 | Web arena | Asynchronous or turn-based duel over a Hono websocket. No heavy game engine | 1b rules | `cloud/hono-server` |

Phase 2 uses marketplace ideas (offers, fills, fees) in miniature. It does not import Artemis market data or live trading.

## Stack alignment

| Concern | Intended home |
|---------|----------------|
| Inventory UI | `apps/card-forge` or `apps/web`, Apolyx |
| Motion | `motion` on card merge |
| RNG and craft resolution | `cloud/hono-server` |
| Inventory and trade log | Turso via `elements/base` |

## Monetization hypothesis

Cosmetic skins, paid craft tools, and a faster merge timer. Fees on phase 2 listings if the exchange exists. No token sale.

## Open questions

1. Public name: ForgeRealm or CardCraft?
2. Phase 1a content: how many card templates, and what is on a face (name, tier, one stat)?
3. Merge rule in one sentence (example: two same-tier cards become one of the next tier, inputs destroyed)?
4. Is phase 1 allowed to be local-only (no account) until 1c?

## When this track is chosen

Add a sharpening note with the public name, ten placeholder cards, the one merge sentence, and non-goals (no token, no arena, no marketplace). That is the entrance to `feature_list/forge-realm/`. Phase 1a is the only slice that would move into `plan/` first.
