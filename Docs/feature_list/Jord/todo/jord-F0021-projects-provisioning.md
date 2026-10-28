---
title: "jord-F0021 — projects & provisioning"
feature_id: jord-F0021
description: "Studio Projects surface: define a project, pick libSQL/libSQL-Turso/Postgres, set credentials and keys at create time"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0021
  - studio
  - projects
---

# jord-F0021 — projects & provisioning

> **Status:** todo · **Id:** `jord-F0021` · Index: [[../INDEX]] · As-built today: [[../../../tech_space/jord/studio/README]]

## What

Studio becomes **multi-project**. A new **Projects** area lists projects and has a **New project** page. Each project owns one database connection and one credential set; every existing Studio screen is scoped to the active project instead of the single `JORD_SERVER_URL` database.

### New project form

| Field | Notes |
|-------|-------|
| Name / slug | Slug is immutable after create (used in routes, keys, realtime channels) |
| Engine | `libsql-file` · `libsql-turso` · `postgres` |
| Target | File path (libSQL file) · `libsql://…` URL (Turso) · `postgres://host:port/db` (Postgres) |
| TLS mode | Postgres only: disable / require / verify-full |
| DB user | Postgres only |
| **DB password** | Set at create; write-only field, never echoed back |
| Publishable key | Generated at create — client-safe, header-scoped |
| **Secret key** | Generated at create, shown **once**, stored server-side only |
| API barrier key | Generated at create — rate-limit / origin barrier in front of the generated API |
| Notes / region | Free text |

Create flow: validate → **test connect** → write control-plane record → generate keys → baseline the project (`jord_tracked_tables` / audit tables as configured) → land on [[jord-F0022-project-dashboard|the project dashboard]].

### Project scoping

- Routes: `/p/[project]/…` (nav keeps its current shape once inside a project).
- Active project in session cookie; project switcher in the header.
- Existing invariants hold: **no connection secret or `data/jord.db` handle ever reaches the browser**; reveal/rotate go through an audited server route.
- Archive ≠ delete: archiving hides a project and revokes its keys; it never drops the database.

## Acceptance

1. A project can be created for each of the three engines and opened from the switcher.
2. DB password and secret key are set at create, never returned in list/detail JSON, and are rotatable with an audit row.
3. Two projects keep separate tables, keys, policies, and realtime channels in the same Studio session.
4. Connect-test failure surfaces the engine error and does not write a half-created project.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0012-studio\|jord-F0012]] | Studio today is one database from env; this adds the project layer |
| [[../done/jord-F0002-dialects\|jord-F0002]] | Reuses the existing dialect/connection logic; don't fork a second connector |
| [[../done/jord-F0005-auth\|jord-F0005]] | Studio session/roles gate every project route |

## Open questions (decide in the ADR before coding)

- **Control-plane store** — where project metadata + encrypted secrets live (separate libSQL file vs Postgres vs env-sealed file). Needs a saga ADR; do not store secrets in the project database.
- Create-vs-register: does "new project" also create the libSQL/Turso/Postgres database, or only register an existing target? Intent here is **register + test**; hosted provisioning stays out.
- Secret-at-rest mechanism (OS keyring / KMS / encrypted file + master key env).

## Out of scope

Billing · per-project team RBAC · hosted provider APIs (Turso/Neon) · database deletion · cross-project queries.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0042-control-plane-store-adr\|S0042]] — control-plane store + ADR | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0043-project-registry-api\|S0043]] — project registry API + keys | 2.5–3 h | todo |
| [[../../../plan/Jord/phase-03/S0044-new-project-wizard\|S0044]] — New project wizard | 2.5–3 h | todo |
| [[../../../plan/Jord/phase-03/S0045-project-scoped-routes\|S0045]] — /p/[project] scoping + switcher | 2.5–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
