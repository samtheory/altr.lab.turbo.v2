---
title: "Jord phase-02 plan — review brief"
description: "Self-contained phase-02 plan + as-built context + pre-approval checks for an outside reviewer"
created: 2026-10-24
updated: 2026-10-25
tags:
  - report
  - jord
  - phase-02
  - plan
  - review
---

# Jord phase-02 plan — review brief

> **Audience:** a model or human that has **not** seen this planning session or the repo.  
> **As of:** 2026-10-24.  
> **Status:** review snapshot from 2026-10-24. **Since then:** S0027 (CI workflow) and S0021-A (file libSQL migration runner) are in the tree. Postgres advisory-lock tests for A were not run. As-built: `Docs/tech_space/jord/overview/README.md`. The sections below are the pre-implementation review.  
> **Truth order:** code > `Docs/tech_space/jord/<category>/` > this report > `Docs/plan/Jord/phase-02/` > `Docs/feature_list/Jord/`.  
> **As-built baseline (phase-01):** `Docs/report/Jord-technical-brief.md` (S0001–S0020).  
> **This file is the handoff.** Section 5 is the plan. Section 9 is the only execution order. Section 11 = locked decisions. Section 12 = mimir recommendations. Section 13 = pre-approval checks with recorded command output. Appendices do not override section 5.

Ask the reviewer: *Is this order safe to execute? Do you agree with section 11 / 12? Are the open questions in section 8 acceptable?*

---

## 0. How to use this document

1. Read **§0.1 As-built** if you do not know Jord.
2. Read **§4 Invariants** — these must not break in phase-02.
3. Read **§5 Sprint plan** — what to build, in order.
4. Read **§9** — the numbered queue (same as `Docs/plan/Jord/phase-02/README.md`).
5. Read **§11** for locked decisions and **§12** for mimir’s rationale.
6. Read **§13** for greps and path checks already run on this tree.
7. Card detail lives under `Docs/plan/Jord/phase-02/Jord-S00xx/`. Features: `Docs/feature_list/Jord/03-phase-02-features.md`.

**Do not start S0027 (or any product code) until the human approves this plan.**

### 0.1 As-built in one page (phase-01)

Jord is the **data plane** of the `altr.lab` monorepo: one library, one HTTP process, one Next.js admin (Studio).

| Fact | Value |
|------|--------|
| Packages | `@altr/jord` (`elements/jord`), `@altr/jord-server` (`cloud/jord`), `@altr/jord-studio` (`apps/jord-studio`) — private, not on npm |
| Runtime | Node ≥ 20, pnpm, Turbo. Not Bun |
| Default store | `DATABASE_URL` → `file:./data/jord.db` (gitignored libSQL) |
| Other stores | `libsql://` (Turso + token), `postgres://` / `postgresql://` |
| Writes | One in-process write queue on the server. OCC on `records.version` → HTTP 409 |
| Auth today | Shared secret `JORD_SERVER_TOKEN`. Raw bearer → `JORD_DEFAULT_ROLE` (default `admin`). Studio mints HMAC session tokens (`admin` / `editor` / `readonly`) via `signSessionToken` and never sends the raw secret from the browser |
| Roles in code | `admin`, `editor`, `readonly` — `cloud/jord/src/auth/roles.ts` |
| Realtime today | In-process bus; client event name `jord.change`. Phase-02 **replaces the producer** (outbox) and **keeps the event name** |
| Studio | Next.js on port 3005. Proxies to jord-server. **Never** opens the DB file or sees connection strings |
| Closed work | Sprints **S0001–S0020**. Phase-01 archive: `Docs/plan/Jord/phase-01/` |
| Gaps that phase-02 closes | No CI; ad-hoc boot DDL; no end-user principals / JWT; no FORCE RLS + non-owner runtime role; no public table API; realtime not durable; no private fetch client; Studio SQL/migrate/log gaps; storage still local-first; functions isolation undecided |

**Key paths (verified §13.4):**

| Path | Role |
|------|------|
| `cloud/jord/src/index.ts` | Server boot; passes `env.DATABASE_URL` into `createJordClient` |
| `cloud/jord/.env.example` | Documents `DATABASE_URL`, `JORD_SERVER_TOKEN`, … |
| `cloud/jord/src/auth/roles.ts` | Operator roles |
| `cloud/jord/src/auth/token.ts` | Raw secret + HMAC verify/sign |
| `cloud/jord/src/app.test.ts` | Integration tests; `authHeaders("raw")` |
| `elements/jord/src/url.ts` | Parses `DATABASE_URL` / default `file:./data/jord.db` |
| `elements/jord/src/client.ts` | `createJordClient` |
| `apps/jord-studio/src/components/connection-panel.tsx` | Read-only connection labels; tells user to set `DATABASE_URL` on the server |

---

## 1. Context (phase-02 planning)

| Fact | Value |
|------|--------|
| Product | Jord data plane (same packages as §0.1) |
| Runtime | Node ≥ 20, pnpm, Turbo. Not Bun |
| Stores | **`DATABASE_URL`**: `file:` (default), `libsql://`, `postgres://`. Owner DDL (Postgres only) adds **`JORD_MIGRATE_URL`**. Do not rename runtime env |
| Phase-01 | Closed. S0001–S0020. Fixture pin: commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c` (`JORD S0020 implemented`) |
| Auth today | See §0.1. Phase-02 adds `Principal` kinds and JWT; legacy raw secret controlled by `JORD_LEGACY_SECRET_ROLE` |
| Realtime today | In-process bus, event `jord.change` → S0023 replaces producer, keeps name |
| Connection URL in Studio | **Cut** in S0024 (not deferred). Read-only labels + env restart |

---

## 2. Process

- Plan the whole phase once (this file + cards). Implement **one stop**, then stop for human review.
- S0026 is an **ADR only** — no product code, **no product blocker**.
- No new native / node-gyp dependencies (`isolated-vm` rejected; Monaco rejected for Studio editor).
- After each card: that card's PR updates its own `Docs/tech_space/jord/<category>/README.md`. The S0021 verify step only reconciles links, ticks F1–F3, and refreshes STATUS. It writes no new content.

---

## 3. Path conventions

| Kind | Location |
|------|----------|
| Sprint cards | `Docs/plan/Jord/phase-02/Jord-S00xx/` |
| Phase-02 index | `Docs/plan/Jord/phase-02/README.md` |
| Features | `Docs/feature_list/Jord/03-phase-02-features.md` |
| As-built categories | `Docs/tech_space/jord/<category>/README.md` (no phase folders under tech_space) |
| Phase-01 archive | `Docs/plan/Jord/phase-01/` (do not reopen) |

Sprint **ids** (S0021, S0027, …) are stable labels. **Execution order is not numeric id order** — S0027 runs first.

---

## 4. Invariants (must hold through phase-02)

1. Studio and the browser never import `@altr/jord`, open the DB, or see connection strings or tokens.
2. libSQL hot writes use one in-process queue. Postgres write concurrency defaults to 1 (`JORD_PG_WRITE_CONCURRENCY`). SQL **reads** in S0024 use a different connection (not the write queue).
3. `records` OCC returns HTTP **409**.
4. **R2. WAL scope.** WAL / `journal_mode` and truncate checkpoints apply only to `file:` URLs. Never for hosted `libsql://` or `postgres://`. Confirmed in `elements/jord/src/adapter/libsql.ts` (WAL pragmas run only on the `file:` open path). No WAL code change in S0021-A.
5. `@altr/base` is a leaf. Studio uses `@altr/apolyx` only (no Radix / local kit forks).
6. No Artemis domain tables stuffed into `records.body`.
7. No new node-gyp dependencies. **Monaco** and **`isolated-vm`** are rejected options only.
8. Every new route has a declared access rule + tests. File libSQL always; Postgres via `JORD_TEST_POSTGRES_URL` (opt-in).

---

## 5. Sprint plan (matches the cards)

### 1. S0027 — CI

**Blocked by:** nothing. **Runs first, before any S0021 work.**  
Card: `Docs/plan/Jord/phase-02/Jord-S0027/` · Feature F9

GitHub Action: typecheck + tests for `@altr/jord`, `@altr/jord-server`, `@altr/jord-studio`. File libSQL on CI. Postgres stays opt-in. Id stays S0027; position is 1. Exists so auth/policy work cannot merge red.

### 2. S0021-A — Migrations (`jord-s0021-a`)

**Blocked by:** S0027.  
Card: `Docs/plan/Jord/phase-02/Jord-S0021/01-migration.md` · Feature F1

Forward-only `jord_migrations` runner. Baseline adopts phase-01 tables without destroying data. Checksum mismatch **refuses boot**. Postgres: advisory lock so two boots cannot double-apply. libSQL: write queue + runner mutex.

**R1. Baseline checksum.** Checksum = SHA-256 (hex, lowercase) of the migration SQL file bytes after converting CRLF to LF. The baseline migration body is frozen. Any edit changes the checksum and boot refuses. A fixture test asserts the stored checksum equals the value computed from the file.

**R3. Dump environment.** Fixture `cloud/jord/fixtures/phase-01-baseline.sql` is pinned to commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`. Create `dump:phase-01-baseline` in S0021-A (it does not exist today). Then:

```
git worktree add ../jord-p01 eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c
```

In `../jord-p01`: `pnpm install --frozen-lockfile`, run the dump script. The script writes the header `-- source: eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`. Copy the dump into the main repo, then `git worktree remove ../jord-p01`. Re-running the script produces an identical dump (diff is empty). The Part A test loads the fixture, runs the baseline, and checks the seed row survives.

**R4. Doc ownership.** This card's PR updates `Docs/tech_space/jord/overview/README.md`. Part B updates `tech_space/jord/auth`. Part C updates `tech_space/jord/policies`. Verify only reconciles links, ticks F1–F3, and refreshes STATUS. It writes no new content.

### 3. S0021-B — Principals (`jord-s0021-b`)

**Blocked by:** Part A.  
Card: `Docs/plan/Jord/phase-02/Jord-S0021/02-auth.md` · Feature F2

Introduce one auth subject for all later cards:

```ts
type Principal = {
  kind: "service" | "user" | "anon" | "operator"
  uid?: string
  role: string
  claims: Record<string, unknown>
}
```

| Kind | Meaning |
|------|---------|
| `operator` | Studio HMAC roles `admin` / `editor` / `readonly` (stay valid) |
| `service` | Raw shared secret as data-plane bypass (`service_role`) when legacy switch says so |
| `user` | End user JWT (`sub` = uid) |
| `anon` | Long-lived anon JWT |

**Raw secret (`JORD_LEGACY_SECRET_ROLE`) — decided:** default **`admin`** for the S0021-B transition (keeps today's raw-token mapping; boot deprecation warning). Before the card closes, **flip the unset default to `service`**. Same sprint: update curl examples, READMEs, `.env.example`, and `authHeaders("raw")` in `cloud/jord/src/app.test.ts`. Tests for both modes. Caller inventory is on the card (Studio HMAC only; no bots in-repo).

Also: async scrypt + timing-safe compare; no email enumeration; console `MailerPort` only; HS256 JWT with `kid` rotation (`JORD_JWT_SECRET` + previous); SSE/WS close at JWT `exp`. No OAuth.

### 4. S0021 threat-model ADR

**Blocked by:** Part B as the subject. **Must be accepted before Part C code.**  
Card: `Docs/plan/Jord/phase-02/Jord-S0021/ADR-threat-model.md`

Documents principals, trust boundaries, and defenses against uid leak, policy bypass, token replay, refresh reuse, email enumeration, brute force.

### 5. S0021-C — Policies (`jord-s0021-c`)

**Blocked by:** Part B and the ADR.  
Card: `Docs/plan/Jord/phase-02/Jord-S0021/03-policy.md` · Feature F3

Deny overrides allow. No policy → default-deny for `anon` and `user`. `service` bypasses. Per-table `rls_enabled`. UPDATE: USING + WITH CHECK. Owner column immutable for non-service. Route inventory test (undeclared route fails). Shared dialect conformance suite (file libSQL always; Postgres opt-in).

**Postgres URLs:**

| Env | Role |
|-----|------|
| `JORD_MIGRATE_URL` | Table owner. Migration runner only. Prefer `CREATEROLE` to create `jord_app` |
| `DATABASE_URL` | Runtime pool as `jord_app`. **Name unchanged** — no second runtime env, no alias, no deprecation warning |

**CREATEROLE fallback:** if the host denies `CREATEROLE`, an operator creates `jord_app` by hand. Runner verifies: role exists, no `BYPASSRLS`, does not own application tables, then applies grants / `FORCE ROW LEVEL SECURITY`. Clear fail if any check fails.

**R8 hard rule:** refuse to boot if migrate and runtime URLs are the **same connection**. Compare parsed **host, port, database, user** (not raw strings). Ignore query params and trailing slashes. Test required.

Startup: refuse if runtime role owns tables or has `BYPASSRLS`. `file:` / `libsql://` ignore `JORD_MIGRATE_URL`. `set_config(..., true)` / `SET LOCAL` **inside the transaction only**.

### 6. S0028 — HTTP hardening

**Blocked by:** S0021-C. **Next:** S0022.  
Card: `Docs/plan/Jord/phase-02/Jord-S0028/` · Feature F10

CORS allow-list, data-route rate limits, body size cap (~1 MiB), graceful shutdown drains the write queue, optional `Idempotency-Key`. Lands **before** the public table API.

### 7. S0022 — Table API

**Blocked by:** S0028. **Next:** S0023.  
Card: `Docs/plan/Jord/phase-02/Jord-S0022/` · Feature F4

PostgREST-lite `/api/v1/:table` (GET/POST/PATCH/DELETE). Coerce query values by column type. libSQL `ilike` = `lower(column) LIKE lower(?)`. Caps: limit default 100 / max 1000, `in` max 100, body 1 MiB. PATCH/DELETE without filter rejected; `?all=true` **service only**. Composite PKs. `Prefer: count=planned` (not costly `exact` by default). `Prefer: return=representation` via `RETURNING`. OpenAPI from introspection. Thin fetch helper lives in the **S0022 test folder** (must not import `@altr/jord`); S0029 promotes it. No embeds/joins. Studio docs + playground (Apolyx).

### 8. S0023 — Outbox CDC

**Blocked by:** S0022. **Next:** S0029.  
Card: `Docs/plan/Jord/phase-02/Jord-S0023/` · Feature F5

Opt-in `jord_tracked_tables`. Same-transaction `jord_changes` outbox. **Replace** the phase-01 in-process producer; keep event name `jord.change`. Watermark: libSQL = write queue order; Postgres = withhold higher seq while lower seq in flight (test the race). Indexes on `seq` and `(table_name, seq)`. Retention default **7 days and 100_000 rows** (both configurable). `pg_notify` payload = **seq only**. `since` past retention → **410** + resync hint. Policy filter at delivery. BLOBs omitted or referenced. Studio raw SQL on libSQL is not captured.

### 9. S0029 — `@altr/jord-client`

**Blocked by:** S0023. **Next:** S0024.  
Card: `Docs/plan/Jord/phase-02/Jord-S0029/` · Feature F11

Private workspace fetch package. Promotes the S0022 test-folder helper. Auth refresh, table API, realtime `since` resume; on 410 surface resync. **Must not depend on `@altr/jord`.**

### 10. S0024 — Studio tools

**Blocked by:** S0029. **Next:** S0025.  
Card: `Docs/plan/Jord/phase-02/Jord-S0024/` · Feature F6 · Hats: mimir → apollo

SQL editor: reads off the write queue; engine read-only via `PRAGMA query_only` or `BEGIN READ ONLY` + `statement_timeout`; writes through the queue; audit log. **Monaco rejected.** **URL editor is cut** (read-only labels + env restart). Migrate wizard: type map, skip `jord_vix_*`, resumable, never deletes source. Auth admin UI. Logs batched outside the hot queue and redacted.

### 11. S0025 — Storage

**Blocked by:** S0024. **Next in docs queue:** S0026 (ADR only).  
Card: `Docs/plan/Jord/phase-02/Jord-S0025/` · Feature F7

`JordStoragePort` + S3 adapter. Policy at **sign time**, short TTL. pending → finalize → GC. Local HMAC URLs match S3 client shape. Copy / verify / switch — do not delete local bytes in the same step.

### 12. S0026 — Functions ADR

**Blocked by:** nothing (**no product blocker**). **No product code.** Queue #12 is documentation order only.  
Card: `Docs/plan/Jord/phase-02/Jord-S0026/` · Feature F8

Recommend `worker_threads`. Reject `isolated-vm`. Do not implement without a follow-up approval.

---

## 6. Feature map

| Feature | Stop |
|---------|------|
| F9 CI | S0027 |
| F1 Migrations | S0021-A |
| F2 Principals | S0021-B |
| F3 Policies | S0021-C |
| F10 Hardening | S0028 |
| F4 Table API | S0022 |
| F5 CDC | S0023 |
| F11 Client | S0029 |
| F6 Studio | S0024 |
| F7 Storage | S0025 |
| F8 Functions ADR | S0026 |

---

## 7. Out of phase-02

OAuth, magic links, a real mail provider, embeds/joins, a writable Studio URL editor, hosted embeddings, Redis, Artemis trading tables, Bun, `isolated-vm`, a second realtime producer, npm publish.

---

## 8. Questions for the outside reviewer

1. Is a SQL text fixture enough for S0021-A, or do you want a binary sqlite snapshot beside it?
2. Are both retention caps (7 days and 100_000 rows) right?

(R8 / migrate≠runtime URL is **accepted** as §11.9 — not a question.)

---

## 9. Execution order

This is the only order. Matches `Docs/plan/Jord/phase-02/README.md`. Cards use the same blocked-by chain (S0026 has none).

1. S0027 — CI, first  
2. S0021-A — migrations  
3. S0021-B — auth  
4. S0021 threat-model ADR — accepted before C  
5. S0021-C — policies  
6. S0028 — HTTP hardening  
7. S0022 — table API  
8. S0023 — outbox CDC  
9. S0029 — client SDK  
10. S0024 — Studio tools  
11. S0025 — storage  
12. S0026 — functions ADR, no code, no product blocker  

Do not start S0027 until this plan is approved. Each card's PR updates its matching `tech_space` category. S0021 verify only reconciles links, ticks F1–F3, and refreshes STATUS.

---

## 10. File index

| File | Role |
|------|------|
| `Docs/report/Jord-technical-brief.md` | What phase-01 built (full as-built) |
| `Docs/feature_list/Jord/03-phase-02-features.md` | Acceptance criteria F1–F11 |
| `Docs/plan/Jord/phase-02/README.md` | Same order as §9 |
| `Docs/plan/Jord/phase-02/Jord-S0021/` … `Jord-S0029/` | Sprint cards |
| `Docs/tech_space/jord/README.md` | Living as-built categories (update on ship) |
| `Docs/agents/mimir/instructions/00-workflow.md` | Program-master conduct |

---

## 11. Decisions (accepted into section 5)

### 11.1 Legacy switch — **accepted**

`JORD_LEGACY_SECRET_ROLE` defaults to **`admin`** for the S0021-B transition (keeps today's raw-token mapping; boot deprecation warning). Before the card closes, **flip the unset default to `service`**. Same sprint: update curl examples, READMEs, `.env.example`, and `authHeaders("raw")` in `cloud/jord/src/app.test.ts`. Tests for both modes.

### 11.2 Runtime URL name — **accepted: keep `DATABASE_URL`**

Runtime stays **`DATABASE_URL`**. Owner DDL uses `JORD_MIGRATE_URL`. Do not rename the runtime env or add an alias/deprecation warning. Prefer `CREATEROLE` to create `jord_app`; otherwise verify-only fallback (exists, no `BYPASSRLS`, non-owner) then grants.

### 11.3 Role check is Postgres-only

`file:` and `libsql://` skip the owner / `BYPASSRLS` startup check.

### 11.4 Fixture is SQL text

`cloud/jord/fixtures/phase-01-baseline.sql` from commit `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c` using the worktree steps in §5 S0021-A (R3). Checksum rule is R1 (SHA-256 hex lowercase of LF-normalized SQL). Script `dump:phase-01-baseline` is created in S0021-A.

### 11.5 Fetch helper starts in the S0022 test folder

S0029 promotes it into `@altr/jord-client`. Must not import `@altr/jord`.

### 11.6 Retention is both caps

7 days **and** 100_000 rows, both configurable.

### 11.7 Keep the event name `jord.change`

Replace the in-process producer; do not rename the event.

### 11.8 S0026 has no product blocker

ADR only; queue #12 is documentation order.

### 11.9 Migrate URL must differ from runtime URL (Postgres) — **accepted**

Refuse to boot if `JORD_MIGRATE_URL` and `DATABASE_URL` are the same connection. Compare parsed host, port, database, and user (not raw strings). Ignore query params and trailing slashes. Test required. Hard DoD on S0021-C.

---

## 12. Mimir recommendations (and reasons)

Checked against code (`cloud/jord`, `elements/jord`, Studio auth) and the as-built brief. Reflected in §5 / §11.

| # | Recommendation | Reason |
|---|----------------|--------|
| R1 | **Keep `DATABASE_URL`** as the only runtime env name | Code, `.env.example`, Studio, and `tech_space` already use it. A rename would churn every package for no security gain. `JORD_MIGRATE_URL` is the only new URL, and only for Postgres owner DDL. |
| R2 | **`CREATEROLE` when possible; verify-only fallback otherwise** | Hosted Postgres often denies `CREATEROLE`. Operator-created `jord_app` is fine if the runner still verifies exists / no `BYPASSRLS` / non-owner before grants. |
| R3 | **Legacy default `admin` → flip to `service` inside S0021-B** | Identical to §5 / §11.1: default **`admin`** for the S0021-B transition (keeps today's raw-token mapping; boot deprecation warning). Before the card closes, **flip the unset default to `service`**. Same sprint: update curl examples, READMEs, `.env.example`, and `authHeaders("raw")` in `cloud/jord/src/app.test.ts`. Tests for both modes. Studio already uses HMAC, so UI is safe; curl and tests would break on a day-one `service` default. |
| R4 | **SQL text fixture from pinned phase-01 commit; create dump script in S0021-A** | Binary sqlite depends on the libSQL build and diffs badly. Pin `eb7d7fd…`. Script is not in the tree until S0021-A. |
| R5 | **Both retention caps (time and row count)** | Hot tracked tables on `file:` can fill disk inside 7 days. Either cap tripping is enough to prune. |
| R6 | **Test-folder helper in S0022, promote in S0029** | Keeps S0022 from shipping a public SDK early; forces a real promotion step when CDC/`since` exist. |
| R7 | **S0026 unbound from S0025** | An ADR needs no storage ship. Writing it late is fine; blocking product work on it is not. |
| R8 | **Assert migrate URL ≠ pool URL at boot (Postgres)** | Accepted as §11.9 / hard DoD. Parsed host/port/db/user comparison. |
| R9 | **Do not start S0027 until this pass is approved** | Plan churn already happened; one green light before CI. |

---

## 13. Pre-approval checks (run before the plan is approved)

Run from the repo root. Do not mark an item done without the command output. Recorded **2026-10-24** on this tree.

### 13.1 Redaction artifacts

Commands run from the repo root on 2026-10-24. Raw stdout below. `rg` exit code 1 means zero matches (no stdout).

**1.** `rg -n "secret-[0-9a-f]{8}" Docs/ cloud/jord elements/jord apps/jord-studio`

```
```

Exit code: `1`

**2.** `rg -n "DEFAULT_DATABASE_URL" elements/jord cloud/jord`

```
elements/jord\src\url.ts:6:export const DEFAULT_DATABASE_URL = "file:./data/jord.db";
elements/jord\src\url.ts:33:    url ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
elements/jord\src\index.ts:160:  DEFAULT_DATABASE_URL,
```

Exit code: `0`

**3.** `rg -n "file:" elements/jord/src/url.ts cloud/jord/.env.example`

```
cloud/jord/.env.example:5:# DATABASE_URL=file:./data/jord.db
elements/jord/src/url.ts:6:export const DEFAULT_DATABASE_URL = "file:./data/jord.db";
elements/jord/src/url.ts:35:  if (resolved.startsWith("file:")) {
elements/jord/src/url.ts:50:/** @deprecated Use resolveDatabaseUrl().url for file: only callers. */
elements/jord/src/url.ts:59:/** Filesystem path for a `file:` URL (mkdir / snapshot target parent). */
elements/jord/src/url.ts:61:  if (!fileUrl.startsWith("file:")) {
elements/jord/src/url.ts:64:  const rest = fileUrl.slice("file:".length);
elements/jord/src/url.ts:65:  // Absolute file URLs: file:///… or file://localhost/…
elements/jord/src/url.ts:72:/** Build a `file:` URL from an absolute or relative filesystem path. */
elements/jord/src/url.ts:77:    return `file:///${normalized}`;
elements/jord/src/url.ts:80:    ? `file://${normalized}`
elements/jord/src/url.ts:81:    : `file:${normalized}`;
```

Exit code: `0`

Decoded beside the raw blocks (character codes, not terminal text):

| Source line | Character codes of the value | Decoded text |
|-------------|------------------------------|--------------|
| `elements/jord/src/url.ts:6` (inside the quotes) | `102 105 108 101 58 46 47 100 97 116 97 47 106 111 114 100 46 100 98` | `file:./data/jord.db` |
| `cloud/jord/.env.example:5` (after `=`) | `102 105 108 101 58 46 47 100 97 116 97 47 106 111 114 100 46 100 98` | `file:./data/jord.db` |
| `elements/jord/src/url.ts:35` `startsWith` argument | `102 105 108 101 58` | `file:` |
| `elements/jord/src/client.ts:19` | scheme bytes `102 105 108 101 58`, then `WAL` | `` `file:` → LibSqlAdapter (mkdir + WAL) `` |
| `elements/jord/src/adapter/libsql.ts:177` | `PRAGMA journal_mode = WAL` | WAL pragma is on the libSQL adapter used for that scheme |

**Decision:** The grep is valid. There are **no** real `secret-[0-9a-f]{8}` literals in code or in `Docs/` (command 1, exit 1). A **display mask** can show the scheme bytes above as `secret-<8 hex>` in a viewer. The files on disk were checked with character codes and already store the decoded values (`file:` / `file:./data/jord.db`). The mask was handled by not copying viewer text and by leaving those bytes in place. **Replacements in Docs: 0.** No `UNVERIFIED` values.

### 13.2 Fixture commit

**Command:** `git log --oneline -n 1 eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`

**Output:**

```
eb7d7fd 🏫JORD S0020 implemented
```

**Result:** Matches expected subject (`JORD S0020 implemented`). Hash kept in §5, §11.4, R4. Full hash: `eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c`.

### 13.3 Dump script

**Command:** search `cloud/jord/package.json` (and nested package.json) for `dump:phase-01-baseline`

**Output:**

```
(script not found)
```

**Action:** §5 S0021-A, §11.4, R4, the S0021-A card, and F1 now state explicitly: the script **does not exist yet** and is **created in S0021-A**. Do not claim it already exists.

### 13.4 Repo paths named in the report

| Path | `Test-Path` / find |
|------|---------------------|
| `cloud/jord/src/index.ts` | OK |
| `cloud/jord/.env.example` | OK |
| `cloud/jord/src/auth/roles.ts` | OK |
| `cloud/jord/src/auth/token.ts` | OK |
| `cloud/jord/src/app.test.ts` | OK |
| `elements/jord/src/url.ts` | OK |
| `elements/jord/src/client.ts` | OK |
| `apps/jord-studio/src/components/connection-panel.tsx` | OK (exact path from find) |

**Missing:** none.

### 13.5 Env var in code

**Command:** `rg -n "DATABASE_URL" cloud/jord/src/index.ts elements/jord/src/url.ts apps/jord-studio`

```
cloud/jord/src/index.ts:105:    url: env.DATABASE_URL,
elements/jord/src/url.ts:6:export const DEFAULT_DATABASE_URL = "file:./data/jord.db";
elements/jord/src/url.ts:30:/** Classify and validate DATABASE_URL. */
elements/jord/src/url.ts:33:    url ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
apps/jord-studio\src\components\connection-panel.tsx:140:          Set <code className="font-mono">DATABASE_URL</code> on the jord-server
```

Exit code: `0`

Decoded beside that block (character codes of `elements/jord/src/url.ts:6` inside the quotes): `102 105 108 101 58 46 47 100 97 116 97 47 106 111 114 100 46 100 98` = `file:./data/jord.db`. `cloud/jord/src/index.ts:105` passes `env.DATABASE_URL` (no second runtime env name on that line).

**`JORD_DATABASE_URL` outside Appendix B:** none. Only hit in this file is Appendix B changelog (interim rename, reverted).

### 13.6 Consistency

| Check | Result |
|-------|--------|
| §9 order vs `Docs/plan/Jord/phase-02/README.md` | Match (S0027→…→S0026; S0028 blocked by S0021-C; S0026 no product blocker) |
| Card “Blocked by” lines | Match README (§5 headers) |
| Legacy wording §5 / §11.1 / R3 | Identical core sentence (default `admin` → flip to `service`; same-sprint doc/helper updates; tests for both modes) |
| `Monaco` / `isolated-vm` | Only as **rejected** or out-of-phase |
| `parallel` (S0027 parallel-ok) | **No hits** in phase-02 plan / this report / `03-phase-02-features.md` |
| Folders S0021–S0029 | All exist; all listed in README |

### 13.7 Result

Step 5 command (re-run after this section was written):

```
rg -n "secret-[0-9a-f]{8}" Docs/ cloud/jord elements/jord apps/jord-studio ; "exit=$LASTEXITCODE"
```

Recorded output (`$LASTEXITCODE`):

```
exit=1
```

No stdout lines. **Pre-approval checks: PASS.** Step 5 is clean (`exit=1`). No `secret-[0-9a-f]{8}` literals in `Docs/` or the Jord packages. Display mask handled in §13.1 (character codes; replacements in Docs: 0). No `UNVERIFIED` items.

---

## Appendix A — Redaction search

**Command result (see §13.1 and §13.7):** `secret-[0-9a-f]{8}` across `Docs/`, `cloud/jord`, `elements/jord`, and `apps/jord-studio` produced no lines (`exit=1`). **No replacements.** Character codes of `elements/jord/src/url.ts:6` decode to `file:./data/jord.db`. A viewer may mask those bytes as `secret-<8 hex>`; the stored bytes were left as decoded.

Spots in this file that name that scheme:

| Spot | Text in this file |
|------|-------------------|
| §1 Stores | `file:` (default), `libsql://`, `postgres://` |
| Invariant 4 | WAL only for `file:` |
| §5 S0021-C | `file:` and `libsql://` ignore `JORD_MIGRATE_URL` |
| §11.3 | `file:` and `libsql://` skip the check |
| R5 | Hot tracked tables on `file:` |

Role names: `admin`, `editor`, `readonly`. Auth paths and `app.test.ts` verified in §13.4.

## Appendix B — Changelog

Earlier drafts put S0027 beside S0021, described a Studio URL editor, let section 11 override section 5, and defaulted the legacy switch to `service` immediately. Those are void.

Runtime env: one interim draft briefly proposed a renamed runtime env. **That rename was reverted.** The plan keeps **`DATABASE_URL`** only.

| Date | Change |
|------|--------|
| 2026-10-24 | First roadmap S0021–S0027 |
| 2026-10-24 | Hardening addendum: principals, policies, CDC watermark, URL editor cut, S0028, S0029, S0027 first |
| 2026-10-24 | One order; legacy switch; migrate URL; fixture; retention; helper path |
| 2026-10-24 | Interim: briefly proposed `JORD_DATABASE_URL` (reverted — see next row) |
| 2026-10-24 | Keep `DATABASE_URL`; CREATEROLE fallback; S0026 unbound; R8 hard DoD; fixture pin `eb7d7fd…` |
| 2026-10-24 | Expanded self-contained handoff + §13 pre-approval checks (PASS); dump script = create in S0021-A |
| 2026-10-24 | §13.1 / §13.5 / §13.7 redo: raw rg stdout; no `secret-` hits; code default `file:./data/jord.db`; replacements none |
| 2026-10-24 | Char-code check: no `secret-` bytes in Docs; display mask noted; step 5 `exit=1`; replacements 0 |
| 2026-10-24 | S0021 resolutions R1–R4 written into the plan and approved (checksum, WAL scope, worktree dump, doc ownership) |
