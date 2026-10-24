---
title: "Jord — auth and roles"
description: "Bearer or signed session, admin / editor / readonly, and where each capability is enforced"
created: 2026-10-24
updated: 2026-10-24
tags:
  - tech-space
  - jord
  - auth
---

# Jord — auth and roles

> Who: anyone adding a route. Policies sit on top of this: [[../policies/README]]. Studio cookie: [[../studio/README]].

## Why

One process serves Studio and API clients. Roles are feature gates, not database users. `GET /health` stays public so operators can see dialect without a token.

## What

| Role | Read | Write rows / blobs / vectors | Schema DDL, jobs, API toggles |
|------|------|------------------------------|-------------------------------|
| `readonly` | yes | 403 | 403 |
| `editor` | yes | yes | 403 |
| `admin` | yes | yes | yes |

| HTTP | Meaning |
|------|---------|
| 401 | Missing or invalid bearer |
| 403 | Valid session, role too small |
| 409 | OCC or other conflict (not an auth failure) |

Bearer is either the raw `JORD_SERVER_TOKEN` (maps to `JORD_DEFAULT_ROLE`) or an HMAC session `payload.sig`. Studio login sets an HTTP-only `jord_session` cookie; the BFF turns it into `Authorization`. Unsigned Studio traffic redirects to `/login` unless `JORD_STUDIO_OPEN=1`.

## How

| Module | Role |
|--------|------|
| `cloud/jord/src/auth/roles.ts` | `canWrite`, `canAlterSchema`, `canManageApis`, `canManageJobs`, `canSubscribeRealtime`, blob/vector helpers |
| `cloud/jord/src/auth/token.ts` | Raw secret or HMAC |
| `cloud/jord/src/auth/middleware.ts` | Hono guards |
| `cloud/jord/src/auth/config.ts` | Token + default role |
| `apps/jord-studio` middleware | Cookie gate + proxy bearer |

Tokens in `cloud/jord/.env.example` and `apps/jord-studio/.env.example` must match.

## Example

`editor` may `POST /records`. The same token `POST /schema/tables` returns **403**. `admin` gets **201**.

## Not in Jord yet

Multi-tenant users, OAuth, a user table for accounts.
