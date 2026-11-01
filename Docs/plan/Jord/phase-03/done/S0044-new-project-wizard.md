---
title: "S0044 — Projects list + New project wizard"
description: "Apolyx-based project list and create form: engine picker, target, credentials, test-connect, one-time key reveal"
created: 2026-10-28
updated: 2026-11-01
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0044
  - done
---

# S0044 — Projects list + New project wizard

> **Status:** **done** 2026-11-01 · **Depends on** [[S0043-project-registry-api|S0043]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] · After ship: [[../../../../tech_space/jord/studio/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (Studio UI, Apolyx-first) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/ui-ux-pro-max/` · `.agents/skills/vercel-react-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` — form UX + reveal flow |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

A `/projects` screen listing projects (engine badge, target host, status, last connected) and a **New project** form that validates, tests the connection in place, then creates and shows the secret key exactly once with a copy affordance.

## Why now

Studio v2 starts here: without this screen there is no project to scope the rest of the shell to.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] (field table) |
| Depends on | [[S0043-project-registry-api|S0043]] endpoints |
| Code today | `apps/jord-studio/src/app/projects/*` · `components/project-*.tsx` · `lib/projects.ts` · BFF `app/api/admin/projects/` |
| UI kit | `@altr/apolyx` (`Field`, `Input`, `Select`, `Button`, `PasswordInput`, `Checkbox`) — no local primitives |

**Do not break:** Apolyx-first rule (`.cursor/rules/apolyx-first.mdc`); no local primitives; no secret in a URL or `localStorage`.

## In scope

- `/projects` list: rows with engine badge, status, actions (Open, Edit, Archive), empty state with the primary CTA.
- `/projects/new`: name → slug (auto, editable until submit), engine picker, target, TLS mode + db user (Postgres only), db password (write-only), notes.
- **Test connection** button with client-measured latency on success, engine error on failure; blocks submit while failing.
- Post-create reveal panel: publishable key, secret key (copy once, "I stored it" confirm), barrier key; env block + client init snippet.
- Edit existing project (notes + rotate API keys) reuses the same form shell.
- Soft `/p/[project]` landing until S0045.

## Out of scope

Project dataset creation · billing · team members · project deletion (archive only) · full `/p/[project]` shell (S0045).

## Diagram

```mermaid
flowchart LR
  L[/projects list] --> N[/projects/new]
  N --> V{validate}
  V --> T[test connection]
  T -->|ok| C[create]
  T -->|fail| E[inline error, no save]
  C --> R[reveal keys once]
  R --> P[/p/{project} dashboard]
```

## Steps (do in order)

1. Load the apollo skill; read `studio-nav.ts` and the existing connection panel for patterns.
2. Build the list screen + empty state on Apolyx primitives.
3. Build the form with client-side validation and server error mapping.
4. Wire test-connection and create; render the one-time reveal.
5. Keyboard-only pass + focus management on the reveal dialog.
6. `pnpm --filter @altr/jord-studio typecheck` + `build`.
7. **docs_man**: studio tech_space screen table; tick card.

## Done when

- [x] All fields from the intent exist and persist (slug/engine/target/tls/user/password/notes/keys)
- [x] Failed test blocks submit and shows the engine message
- [x] Secret key is shown once and never re-fetchable
- [x] Form is keyboard-operable; labels tied to inputs (`Field`)
- [x] Typecheck passes; proof pasted (build blocked by Google Fonts network in this env)

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-01 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-01 | `pnpm --filter @altr/jord-studio build` | **blocked** — `next/font` failed to fetch Geist / Geist Mono from Google Fonts (`ECONNRESET`); unrelated to S0044 UI |

**Shipped:** `/projects` list + archive · `/projects/new` wizard · `/projects/[id]/edit` · one-time key reveal · BFF `/api/admin/projects*` · nav Projects group · soft `/p/[project]` landing.

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/studio/README.md` |
| Queue | [[../README]] |
