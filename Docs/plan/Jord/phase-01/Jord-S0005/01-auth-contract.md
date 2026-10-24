---
title: "Phase 1 — auth contract (roles + token)"
description: "Define feature roles, credential model, and 401/403 semantics before code"
created: 2026-10-21
updated: 2026-10-21
tags:
  - plan
  - jord
  - Jord-S0005
  - auth
---

# Phase 1 — auth contract (roles + token)

> Who: **heimdall** (security contract) · **saga** (shared types if exported from a package). Studio and server implement against this note.

Sprint index: [[README]] · Intent: [[../../../../feature_list/Jord/03-jord-studio]]

## Status

**done** (2026-10-21)

## Contract

### Feature roles (S3)

| Role | May read records / schema | May write records | May alter schema (`ADD COLUMN`) |
|------|---------------------------|-------------------|----------------------------------|
| `readonly` | yes | no | no |
| `editor` | yes | yes | no |
| `admin` | yes | yes | yes |

These are **Studio / API feature roles**, not SQL policies. Database → Policies / full role admin remain Studio **S7**.

### Credentials (lab v1)

| Piece | Decision |
|-------|----------|
| Server secret | Env `JORD_SERVER_TOKEN` (or documented equivalent) — shared bearer for machine/API callers |
| Operator login | Password / token from env bootstrap (e.g. `JORD_STUDIO_PASSWORD` + role map) — **no** user table required in S3 |
| Session | HTTP-only cookie on Studio BFF after successful login; BFF attaches `Authorization: Bearer …` upstream |
| Expiry | Short-lived session (document default, e.g. 12h) with logout clearing the cookie |

Prefer one clear path. Do not invent Redis sessions or OAuth in this sprint.

### HTTP semantics

| Case | Status |
|------|--------|
| Missing / invalid credentials on protected route | **401** |
| Valid credentials, role insufficient | **403** |
| OCC mismatch on `PATCH` | **409** (unchanged) |

### Public vs protected

| Route class | Auth |
|-------------|------|
| `GET /health` | Public (liveness) |
| Records + schema read/write | Protected |
| Login / session mint (Studio BFF or thin server route) | Public with rate-friendly shape; heimdall documents abuse notes |

## Tasks

- [ ] Write role + claim types (package or Studio+server shared module — avoid `@altr/base` DB coupling)
- [ ] Document env vars in `cloud/jord` + `apps/jord-studio` READMEs (implement in later cards; list names here)
- [ ] Agree which routes stay public

## Done when

Implementers can code middleware and Studio login without inventing a second role model. Out-of-scope items (OAuth, multi-tenant, policies) stay named as later.
