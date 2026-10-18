---
title: "PantryYield — idea track"
description: "R&D folder for fridge inventory, expiry-aware macro recipes, and cost per home-cooked meal"
created: 2026-10-18
updated: 2026-10-18
tags:
  - idea
  - pantry-yield
  - cooking
  - readme
---

# PantryYield

> Open this to grow the kitchen inventory engine. Catalog: [[../2026-10-18-product-catalog]]. Map: [[../../brain/00-Docs-Brain]].

**Life pillar:** cooking and daily skill.

**Vault stage:** captured (phase 0). No app folder yet.

---

## Problem

Busy single people skip cooking, food expires, and eating out quietly becomes the budget. Recipe apps ignore what is already in the fridge and what the training goal needs today.

## Concept

Treat fridge stock as an **asset**. Generate a short recipe from what expires soon and from the macro target (the same targets HyperFit would post). Show what the home meal cost versus a restaurant stand-in.

## Who it is for

You, cooking for one, with a fitness macro target. Meal-prep SaaS for other people waits until your own fridge loop is boring and reliable.

## Core capabilities

- **Fridge stock ticker** — each item is a quantity, a unit cost, and an expiry.
- **Dynamic macro recipe** — a model proposes a meal you can cook in about five minutes from items expiring within two days, aimed at the day’s remaining macros.
- **Cost per meal** — purchase price rolled into a plate, set next to a restaurant comparison you configure.

---

## Product phases

| Phase | Name | User-visible outcome | Depends on | Intended packages |
|-------|------|----------------------|------------|-------------------|
| 1 | Stock ticker | Add an item with quantity, cost, and expiry; see a list sorted by expiry | Turso | Hono or a small Next app, Apolyx |
| 2 | Plate cost | Pick items into a meal, see cost per plate and a restaurant number you typed once | Phase 1 | same |
| 3 | Expiry recipe | Ask for one recipe that uses items expiring within two days and hits a macro target you typed | Phase 1 | Hono + model call |
| 4 | HyperFit link | Macro target and “what I ate” can post into the HyperFit ledger | HyperFit phase 1, if that track exists | shared Turso tables, decided later |

Phase 4 is a bridge, not a requirement for PantryYield to be useful.

## Monetization hypothesis

Micro-SaaS for people who meal-prep to a macro goal. Price it after phase 2, when cost-per-meal is the reason to open the app.

## Stack synergy

Hono, a model call, Turso. Apolyx for the list and the cost figure.

## Open questions

1. Units: grams only at first, or pieces and millilitres too?
2. Restaurant comparison: one number you set (“a typical lunch out”), or a per-meal estimate?
3. Recipe output: a paragraph, or a structured card (title, minutes, items used, macros, cost)?
4. When the model invents an ingredient you do not have, do we reject the recipe?

## When this track is chosen

Add a sharpening note with the item fields, the five-minute rule as a hard constraint, the macro inputs (typed, not imported), and non-goals (no grocery delivery, no social recipes, no HyperFit dependency). That is the entrance to `feature_list/pantry-yield/`.
