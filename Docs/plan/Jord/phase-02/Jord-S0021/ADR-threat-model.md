---
title: "ADR — Jord principal threat model (before S0021 Part C)"
description: "Principals, trust boundaries, and the attacks phase-02 must defend against before policy code"
created: 2026-10-24
updated: 2026-10-24
tags:
  - plan
  - jord
  - Jord-S0021
  - jord-s0021-adr
  - security
  - adr
---

# ADR — principal threat model

> Sprint: [[README]]. **Execution #4.** Required before Part C code. Status: **accepted for planning** (2026-10-24). Hat: **heimdall**. Blocked by Part B being the subject of the model; the file itself is already written.

## Context

Phase-01 trusts a shared secret and HMAC operator tokens inside one Node process. Phase-02 adds end users, anon keys, and row policies. Part C must not start until this model is the contract.

## Principals

```ts
type Principal = {
  kind: "service" | "user" | "anon" | "operator"
  uid?: string
  role: string
  claims: Record<string, unknown>
}
```

| Kind | Who | How they authenticate | uid |
|------|-----|------------------------|-----|
| `service` | Trusted server / bot using the legacy shared secret | Raw secret as Bearer → `service_role` when `JORD_LEGACY_SECRET_ROLE` resolves to `service` (see Part B: transition default `admin`, then flip) | none |
| `operator` | Studio human | HMAC session token (`signSessionToken`) carrying `admin` \| `editor` \| `readonly` | none |
| `user` | End user | HS256 access JWT after signup/signin | `sub` |
| `anon` | Public client | Long-lived anon JWT minted from `JORD_JWT_SECRET` | none |

`operator` is not an end user. `service` is not an operator. Document this split anywhere a client chooses a token (OpenAPI, Studio auth page, `@altr/jord-client` README).

## Trust boundaries

| Boundary | Trusted | Untrusted |
|----------|---------|-----------|
| Process env | `JORD_JWT_SECRET`, previous key, shared service secret, DB URL | — |
| `@altr/jord-server` | Enforcement point for authn, authz, SQL binding | — |
| Postgres pool | Connection is reused; **session GUCs are not** | A GUC set outside a transaction leaks to the next borrower |
| libSQL file | API process is the only writer we capture | Raw SQL and external processes are outside the outbox |
| Browser / Studio | May hold an operator HMAC or a user JWT | Must not see DB URLs, service secret, or JWT signing keys |
| `@altr/jord-client` | Fetch + refresh only | Must not import `@altr/jord` or open the DB |

## Attacks we defend against

| Attack | Defense | Where |
|--------|---------|-------|
| **uid leak across pooled PG connections** | `set_config('jord.uid', $1, true)` / `SET LOCAL` **inside the transaction only**. Never on the pooled session outside a tx. Concurrent-uid test on a small pool. | S0021-C |
| **Policy bypass via a secondary route** | One route inventory. Every data-touching surface declares a rule. Test fails if a route has none. Default-deny for `anon` and `user` when a table has no policy. | S0021-C |
| **Token replay** | Access JWT ≤ 15m; `iss` `aud` `exp`; alg pinned to HS256; `none` rejected; `kid` with two verify keys, one sign key. | S0021-B |
| **Refresh reuse** | Opaque refresh stored as hash only; rotate every refresh; reuse revokes the **session family**. | S0021-B |
| **Email enumeration** | Signup, signin, and reset return the same body and similar timing whether the email exists. | S0021-B |
| **Brute force** | In-process rate limit on signup, signin, and reset. Data-route limits land in S0028. | S0021-B, S0028 |
| **Owner reassignment** | Non-`service` UPDATE cannot change the owner column. WITH CHECK on the new row and USING on the old row. | S0021-C |
| **Expired realtime** | SSE/WS close or force re-auth when the JWT `exp` passes. | S0021-B |
| **HMAC confused with user JWT** | HMAC tokens stay `operator` only. They are not accepted as `user`. Test locks this. | S0021-B |

## Non-goals

OAuth, magic links, a real email provider, multi-node session store.

## Consequences

Part C code that cannot point at a row in the attacks table does not ship. Route inventory is a failing test, not a comment.
