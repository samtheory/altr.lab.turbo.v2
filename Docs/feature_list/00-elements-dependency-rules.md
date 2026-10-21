---
title: "Elements dependency rules — base is a leaf"
description: "@altr/base is shared framework utilities with zero element deps; other elements may depend on base only; elements stay independent so projects can add/remove them"
created: 2026-10-21
updated: 2026-10-21
tags:
  - feature
  - elements
  - base
  - architecture
  - monorepo
---

# Elements dependency rules — base is a leaf

> Who: every agent and package author. Monorepo rule so Jord, Apolyx, Tia, and future elements stay mix-and-match.

## How it sounds

**Yes — this is the right shape.** `@altr/base` is a **leaf**: shared framework utilities only. Domain packages (`@altr/jord`, `@altr/apolyx`, …) may depend on base. Base never depends on them. Prefer **no element → element** edges so any project can add or remove an element without dragging a graph of siblings.

## Rules

```
apps / cloud
    │ may depend on
    ▼
elements/*  (jord, apolyx, …)  ──may depend on──►  @altr/base
    │                                                    │
    │ must NOT depend on each other                      │ must NOT depend on
    ▼                                                    ▼
  (prefer zero)                                    any other @altr/* element
```

| Rule | Meaning |
|------|---------|
| **1. Base is leaf** | `@altr/base` has **no** dependency on `@altr/jord`, `@altr/apolyx`, CLI, or any other `elements/*` package |
| **2. Others may use base** | Apps, cloud services, and elements **may** list `@altr/base` for shared utils (env, errors, Result, content helpers, …) |
| **3. Elements stay independent** | Prefer **zero** deps between peer elements (`jord` ↛ `apolyx`, `apolyx` ↛ `jord`). Compose in **apps** / **cloud**, not inside elements |
| **4. Domain stays in domain** | DB clients live in `@altr/jord`. UI primitives live in `@altr/apolyx`. Do not grow those into base |
| **5. Removable** | A consumer project should be able to take only the elements it needs (e.g. Apolyx without Jord, or Jord without Apolyx) |

## What belongs in `@altr/base`

- Tiny shared helpers: `Result`, `assert`, `sleep`, `slugify`, env readers, error types
- Generic content helpers (e.g. markdown frontmatter) with **no** product schema
- Stubs that throw / redirect (“use `@altr/jord`”) — never a live second DB client

## What does **not** belong in `@altr/base`

- libSQL / Drizzle / Hono / React components
- Jord schema, Apolyx primitives, Tia geo types
- Anything that would force every consumer to pull a domain stack

## Allowed examples

| Consumer | May depend on |
|----------|----------------|
| `@altr/jord` | `@altr/base` (optional utils) |
| `@altr/jord-server` | `@altr/jord` (+ optionally `@altr/base`) |
| `@altr/apolyx` | `@altr/base` only if needed — **not** jord |
| `apps/jord-studio` | `@altr/jord` APIs + `@altr/apolyx` UI + optionally `@altr/base` |
| `@altr/base` | npm libs only (e.g. `gray-matter`) — **no** workspace `@altr/*` |

## Agents

| Agent | Must respect |
|-------|----------------|
| **mimir** / sindri / saga | Jord may use base utils; never add `@altr/jord` into base; card 7 keeps base non-client |
| **apollo** | Apolyx may use base utils; never depend on jord |
| **docs_man** | Keep this note + structure / base README honest |

## Links

- Package: `elements/base/README.md`
- Structure: [[../Altr.lab/structure]]
- Jord: [[Jord/00-intent]] · [[Jord/02-architecture]]
- Apolyx: [[ui-kit/00-intent]]
