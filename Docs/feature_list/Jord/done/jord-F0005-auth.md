---
title: "jord-F0005 — auth"
feature_id: jord-F0005
description: "Shipped: principals, HMAC operators, JWT, scrypt, Studio roles; MailerPort console only"
created: 2026-10-24
updated: 2026-10-27
tags:
  - feature
  - jord
  - done
  - auth
---

# jord-F0005 — auth

> Principals and Studio roles. As-built: [[../../../tech_space/jord/auth/README]]. Next (magic link / OAuth / real mail / custom claims): [[../INDEX|phase-03 P4]].

## Phase-01 Studio roles

`admin` / `editor` / `readonly` HMAC operators — **Done** (S0005).

## Principals (phase-02 F2)

`Principal { kind: service | user | anon | operator, uid?, role, claims }`.

| Kind | Mechanism |
|------|-----------|
| operator | HMAC admin/editor/readonly tokens (stay valid) |
| user | JWT HS256 (iss/aud/sub/role/iat/exp, kid rotation, 60s skew) |
| anon | long-lived JWT from `JORD_JWT_SECRET` |
| service | legacy secret role; unset default is `service` |

Async scrypt + maxmem; no email enumeration; `MailerPort` = **console** only. SSE/WS close at exp. User JWT → Postgres `jord.uid` / `jord.claims` session settings.

**Done** 2026-10-25. Plan: [[../../../plan/Jord/phase-02/Jord-S0021/README|S0021-B]]. Threat model: [[../../../plan/Jord/phase-02/Jord-S0021/ADR-threat-model]].

## Not shipped (todo)

Real mailer · magic link · OAuth · custom JWT claims (02.75 B7) · Studio “run as user” · session revoke UI → [[../INDEX|P4]].
