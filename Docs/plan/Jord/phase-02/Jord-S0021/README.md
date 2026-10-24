---
title: "Jord-S0021 — migration foundation + principal auth + unified policies"
description: "Phase-02 opener: migrations, users/sessions/JWT, owner/claim policies — three session stops"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - phase-02
  - auth
  - migrations
  - policies
---

# Jord-S0021 — migration + principal auth + policies

> Who: **mimir**. **Status: planned (awaiting approval).** Features: [[../../../../feature_list/Jord/03-phase-02-features]]. Prior closed: [[../../phase-01/Jord-S0020/README]]. Next: [[../Jord-S0022/README]]. Source prompt: [[../../../../report/Jord-next-phase2-prompt]].

**Sprint id:** `Jord-S0021`  
**Opened:** _(pending approval)_ · **Owner:** mimir  
**Hats:** **sindri** · **saga** · **heimdall** · **docs_man** (Studio auth UI deferred to S0024)

## Why three stops

This card is too large for one session. Implement and **stop for review** after each part:

| Part | Session goal | Card |
|------|--------------|------|
| **A** | Migration runner + baseline | [[01-migration]] |
| **B** | Users, sessions, JWT routes | [[02-auth]] |
| **C** | `owner_eq` / `claim_eq` + dialect matrix | [[03-policy]] |
| — | Verify + docs | [[04-verify]] |

## Goal

Replace ad-hoc boot DDL with migrations; add end-user principals; make the server the single policy enforcement point for user tables (identical on file libSQL and Postgres).

## In scope

- `jord_migrations`, ordered idempotent runner, baseline adopting phase-01 tables
- `jord_users`, `jord_sessions`; scrypt; HS256 access JWT; opaque refresh rotation + family revoke
- Routes: `POST /auth/signup|signin|refresh|logout`, `GET /auth/me`; in-process rate limits
- Roles: `anon`, `authenticated`, keep `admin`/`editor`/`readonly`, legacy secret → `service_role`
- Policy AST: `owner_eq(column)`, `claim_eq`; WHERE injection; insert force-owner; PG `set_config` in-tx only

## Out of scope

OAuth · magic links · Studio auth-admin UI (→ S0024) · table API (→ S0022) · CDC (→ S0023) · changing Studio shared-secret login UX beyond compatibility

## File-level change list (expected)

| Area | Paths |
|------|-------|
| Engine | `elements/jord` — migration types/runner; user/session schema helpers if shared |
| Server | `cloud/jord/src` — boot migrations; `auth/` JWT+scrypt; route mounts; policy compile/inject; PG session GUC |
| Tests | `cloud/jord` (+ `elements/jord` if runner lives there) — file libSQL always; Postgres gated |
| Studio | none required this sprint (compat keep) |
| Docs | `tech_space/jord/auth`, `policies`, `overview` categories |

## Schema

```
jord_migrations(id, name, checksum, applied_at)
jord_users(id uuid, email unique, password_hash, raw_meta json, confirmed_at, created_at, updated_at)
jord_sessions(id, user_id, refresh_token_hash, expires_at, revoked_at, user_agent, created_at)
```

Policy rows reuse `jord_policies` (extend AST kinds only).

## HTTP routes

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/signup` | rate-limited |
| POST | `/auth/signin` | rate-limited |
| POST | `/auth/refresh` | rotate; reuse → revoke family |
| POST | `/auth/logout` | revoke session |
| GET | `/auth/me` | bearer / cookie |

## Tests required

- Migration: empty DB + adopt existing DB + idempotent re-run (file libSQL; Postgres opt-in)
- Auth: signup/signin/me; refresh rotate; refresh reuse revoke; timing-safe compare; rate limit
- Policy: `owner_eq` / `claim_eq` allow/deny matrix identical on libSQL vs Postgres
- Role: `service_role` bypass; Studio `admin`/`editor`/`readonly` still work

## Studio

No new pages. Do not echo tokens. Existing Bearer/cookie Studio login must keep working.

## Definition of Done

- [ ] Parts A → B → C each reviewed with green tests before the next starts
- [ ] Invariants in [[../../../../feature_list/Jord/03-phase-02-features]] hold
- [ ] Categories `auth` + `policies` (+ `overview` boot note) updated
- [ ] Typecheck: `@altr/jord`, `@altr/jord-server`

## Links

- Track: [[../README]]
- Features: [[../../../../feature_list/Jord/03-phase-02-features]]
