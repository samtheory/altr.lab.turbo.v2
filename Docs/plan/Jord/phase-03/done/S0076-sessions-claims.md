---
title: "S0076 — sessions list/revoke + custom JWT claims"
description: "Server-side session records with device/IP/last-seen, single and bulk revoke, plus custom claims injected into issued tokens"
created: 2026-10-28
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0076
  - done
---

# S0076 — sessions list/revoke + custom JWT claims

> **Status:** **done** 2026-11-03 · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]] · After ship: [[../../../../tech_space/jord/auth/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **heimdall** |
| **Companion skills** | `.agents/skills/security-and-hardening/` · `.agents/skills/supabase-postgres-best-practices/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Tokens carry a session id; sessions are rows (device label, IP, last seen, created, revoked). `/auth/sessions` lists mine, admin can list per user, revoke one or all, and revocation takes effect on the next request. Custom claims configured in project settings appear in newly issued tokens.

## Why now

Leftover **B7** from phase-02.75, and the Auth console's Sessions section (`S0070`) is gated on it.

## Context (read before coding)

| Kind | Where |
|------|-------|
| Intent | [[../../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]] · [[../../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] (Sessions, JWT) |
| Code today | `cloud/jord/src/auth/{jwt,token,identity,middleware,admin}.ts` |
| Settings | custom claims come from [[S0069-auth-settings-store|S0069]] |
| Tests | `cloud/jord/src/auth/token.test.ts` |

**Do not break:** existing tokens without a session id keep working until expiry (or are force-refreshed — state the choice); JWT verification path unchanged.

## In scope

- `jord_sessions` table: id, principal, user_agent (parsed label), ip, created_at, last_seen_at, revoked_at, expires_at.
- Issue: token carries `sid`; middleware validates the session is live and updates `last_seen_at` (throttled to once a minute).
- Revoke one / revoke all (self) and admin revoke per user; immediate effect test.
- Custom claims: allowlisted keys merged into the JWT payload; reserved claims (`sub`, `sid`, `role`, `exp`) cannot be overridden.
- Cleanup of expired sessions on the job runner.
- Tests: revoke → next request 401; last_seen throttle; claims appear and reserved keys rejected.

## Out of scope

Device fingerprinting · refresh-token rotation · session UI (console card `S0070` consumes this).

## Diagram

```mermaid
flowchart LR
  L[login] --> S[(jord_sessions)]
  L --> T[JWT with sid]
  T --> MW[middleware: live session?]
  MW -->|revoked| E401[401]
  MW -->|ok| OK[request]
  ADM[admin revoke] --> S
  CL[settings claims] --> T
```

## Steps (do in order)

1. Read jwt/token/middleware; decide the legacy-token policy.
2. Add the table + issue/validate/revoke logic.
3. Add claim merging with a reserved-key guard.
4. Add endpoints for list/revoke (self + admin).
5. Cleanup job + tests.
6. Typecheck + test; paste proof.
7. **docs_man**: auth tech_space sessions/claims; tick card.

## Done when

- [x] Session rows created on login with device/IP/last-seen
- [x] Revoked session fails on the next request (tested)
- [x] Custom claims present in new tokens; reserved keys rejected
- [x] Expired sessions cleaned up
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-03 | `pnpm --filter @altr/jord-server test` | **252 passed** \| 20 skipped (was 238; +14 sessions) — before review fixes |
| 2026-11-03 | `pnpm --filter @altr/jord-server exec tsc --noEmit` | clean |
| 2026-11-03 | `vitest run src/auth` (after heimdall fixes) | **81 passed** (16 in `sessions.test.ts`) |

## What shipped

| Piece | Fact |
|-------|------|
| Model | `jord_sessions` (migration `0022_sessions`): id, user_id, device label, ip, created, last_seen, revoked, expires. **Session id = refresh-token family id**, so revoking a session also revokes its refresh tokens |
| Issue | password sign-in, magic link and OAuth all go through `issueUserSession`; access token carries `sid` (reserved claim) |
| Enforce | `createAuthMiddleware` (only resolver of user JWTs) checks the session on every request: unknown, revoked, expired, wrong-user, banned or deleted user = 401; fails closed if the store errors. `last_seen_at` written at most once a minute |
| Self | `GET /auth/sessions` (current flagged) · `DELETE /auth/sessions/:id` (404 for foreign ids) · `DELETE /auth/sessions[?others=true]` |
| Admin | `GET`/`DELETE /admin/auth/users/:id/sessions` · `DELETE /admin/auth/sessions/:id`; legacy `/admin/users/:id/revoke`, ban and delete also close sessions |
| Refresh | keeps the same `sid`, slides expiry 30 d; a revoked or expired session is never resurrected |
| Cleanup | job kind `sessions_gc` (seeded, hourly) deletes sessions dead for 7 d |
| Claims | custom claims already shipped in S0069/S0071; this card adds `sid` to the reserved list (setting it is a 400, and it cannot be overridden at signing) |

**Legacy policy (chosen):** tokens minted before this card have no `sid` and keep working until their short access expiry; their refresh tokens adopt a session row on first refresh.

**Known / follow-up (heimdall review, not fixed):** open SSE/WebSocket streams only check access-token expiry, so a stream opened before a revoke keeps delivering until that token expires; no absolute session lifetime cap (refresh slides it indefinitely); sid-less tokens cannot be revoked until expiry; admin `revoke` returns a refresh-token count, not a session count; IP comes from `x-forwarded-for` (display only, spoofable without a trusted proxy).

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/auth/README.md` |
| Queue | [[../README]] |
