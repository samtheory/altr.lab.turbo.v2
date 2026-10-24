---
title: "S0021 Part B — principal auth"
description: "jord_users / jord_sessions, scrypt, HS256 JWT, refresh rotation, auth routes"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - auth
---

# Part B — principal auth

> Sprint: [[README]]. **After Part A only. Stop for review.**

## Status

**planned** (blocked on Part A)

## Lock

| Piece | Choice |
|-------|--------|
| Password | `node:crypto` scrypt; per-user salt; params in hash string; `timingSafeEqual` |
| Access token | HS256 JWT: `sub`, `role`, `email`, `iat`, `exp` (15m) |
| Refresh | Opaque; store hash only; rotate every refresh; reuse → revoke session family |
| Legacy secret | Becomes `service_role` (bypasses user policies) |
| New roles | `anon`, `authenticated` |
| Studio roles | Keep `admin` / `editor` / `readonly` |
| Out | OAuth, magic links |

## Routes

`POST /auth/signup`, `/auth/signin`, `/auth/refresh`, `/auth/logout` · `GET /auth/me` · rate-limit signup/signin in-process

## Done when

- [ ] Tables migrated; routes gated and tested
- [ ] Refresh reuse revokes family
- [ ] Studio shared-secret path still authenticates as before (mapped to `service_role` or existing Studio roles per design note in implement)
- [ ] No secrets in logs / health
