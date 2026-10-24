---
title: "Jord-S0024 — Studio power tools"
description: "SQL editor, connection URL editor, migrate wizard, auth admin, durable logs"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0024
  - phase-02
  - jord-studio
---

# Jord-S0024 — Studio power tools

> Who: **mimir → apollo**. **Status: planned** (after S0021; migrate wizard benefits from S0023 optional). Feature F6. Prior: [[../Jord-S0023/README]]. Next: [[../Jord-S0025/README]].

**Sprint id:** `Jord-S0024`  
**Hats:** **apollo** · **sindri** · **heimdall** · **docs_man**

## Goal

Operator surfaces that were deferred in phase-01: SQL, connection editing, migrate wizard, auth admin, durable logs.

## In scope

- SQL editor (admin only): textarea or CodeMirror — **not Monaco** unless Apolyx already has an editor; statement timeout; row cap; read-only toggle; query history; execution time
- Connection page: URL editor stored **server-side only**, never echoed
- Migration wizard: file → Turso/Postgres; copy schema + batched data; verify counts; resumable; never delete source
- Auth admin: list users, revoke sessions, disable user (needs S0021)
- Log explorer: `jord_logs` table + retention (replace memory-only ring)

## Out of scope

Monaco unless already in kit · deleting source DB · exposing secrets to browser

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Studio | `apps/jord-studio` — pages/panels above |
| Server | SQL exec endpoint (admin); connection update; migrate job; auth admin routes; log persist |
| Kit | Missing controls → `elements/ui-kit` first |
| Docs | `tech_space/jord/studio` (+ `auth`, `jobs`, `dialects`) |

## Schema

`jord_logs(...)` + retention policy (exact columns chosen at implement; document in category).

## Tests required

Admin-only SQL gates; readonly mode; migrate dry-run/resume unit; auth admin revoke; logs retention job; no secret echo in Studio JSON fixtures.

## Definition of Done

- [ ] Apolyx-first — no local Dialog/Select/Table forks
- [ ] URL/token never returned to client
- [ ] Migrate never deletes source
- [ ] Category `studio` updated
