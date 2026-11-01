---
title: "ADR — control-plane store (projects + secrets at rest)"
description: "Decide where Studio project metadata and encrypted credentials live; register+test only; AES-GCM + JORD_MASTER_KEY"
created: 2026-11-01
updated: 2026-11-01
tags:
  - tech-space
  - jord
  - studio
  - adr
  - S0042
  - jord-F0021
---

# ADR — control-plane store

> Sprint: [[../../../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]. Parent: [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]]. Category: [[README]]. Status: **Accepted**.

## Context

Studio today is one database from `DATABASE_URL` / `JORD_SERVER_URL`. [[jord-F0021]] adds multi-project: each project owns a **target** connection (libSQL file, Turso, or Postgres) plus publishable / secret / barrier keys. Project **metadata and credentials must not live inside the project target database** (operators could wipe them; policies differ). Coding S0043+ before this shape is fixed creates two competing homes for the same records.

Hard constraints:

- Zero-project install (env-backed single DB) must keep working without a master key or project rows.
- No secret or DB password may appear in list/detail JSON.
- `@altr/base` stays a leaf; no new native / node-gyp deps.
- Create flow intent is **register + test connect**, not hosted provisioning (Turso/Neon APIs).

## Options

### Store (where `jord_projects` / key metadata live)

| Id | Option | Pros | Cons | Verdict |
|----|--------|------|------|---------|
| **(a)** | Separate libSQL control-plane file (e.g. `file:./data/jord-control.db`) | Hard isolation from product data; easy local wipe of projects vs app DB | Second connection, second migration chain, backup/ops story; Studio BFF already assumes one server | **Rejected for v1** — extra surface before multi-tenant hosting exists |
| **(b)** | Separate Postgres database or schema | Strong isolation in hosted PG | Forces Postgres for Studio control plane; breaks default `file:` zero-config | **Rejected for v1** |
| **(c)** | Encrypted JSON / flat file on disk | Simple for a handful of projects | No transactional integrity with key rows; awkward migrate/checksum; concurrent Studio instances race | **Rejected** |
| **(d)** | Tables on the **Jord server primary** (`DATABASE_URL`) — same process DB as other `jord_*` platform tables; **not** inside each registered project target | One migration chain, one backup unit with the server; works for `file:` and `postgres://`; matches “do not store secrets in the project database” | Control plane shares fate with server DB (acceptable for self-hosted Studio) | **Accepted** |

### Secret at rest

| Id | Option | Pros | Cons | Verdict |
|----|--------|------|------|---------|
| **(a)** | OS keyring | OS-managed | Poor headless / container story; platform-specific | **Rejected** |
| **(b)** | Cloud KMS | Strong rotation / audit | Vendor lock-in; blocks local `file:` default | **Rejected for v1** (may return for hosted) |
| **(c)** | AES-256-GCM sealed blobs + `JORD_MASTER_KEY` env (32-byte key, hex or base64) | Pure Node `crypto`; works everywhere; rotate replaces plaintext and bumps envelope version so old ciphertext fails | Operator must supply/rotate the master key; lost key = lost decrypt | **Accepted** |

API keys (publishable / secret / barrier) stay **hashed** in `jord_project_keys` (prefix + last4 for display). Only write-only secrets (DB password, etc.) go through the secret port.

### Create vs register

| Id | Option | Verdict |
|----|--------|---------|
| **(a)** | Register an existing target + test connect | **Accepted** — matches feature intent |
| **(b)** | Hosted provision (create Turso/Neon DB via provider API) | **Out** — later product; not this ADR |

## Decision

1. **Control-plane store = server primary DB.** Ship `jord_projects` and `jord_project_keys` via forward migrations on both dialects. Rows describe registered targets; they never live in the target database itself.
2. **Secrets at rest = AES-256-GCM + `JORD_MASTER_KEY`.** Port: `putSecret` / `getSecret` / `rotate`. Missing or invalid master key **fails loudly** when the port is constructed or used — but boot without the env var remains valid for zero-project / single-DB mode (port stays unset until S0043 routes need it).
3. **Register + test only.** No provider provisioning in this wave.

## Schema (minimum)

`jord_projects`: `id`, `slug` (unique), `engine`, `target`, `tls_mode`, `db_user`, `notes`, `status`, `created_at`, `archived_at`.

`jord_project_keys`: `id`, `project_id`, `kind` (`publishable` | `secret` | `barrier`), `key_hash`, `prefix`, `last4`, `created_at`, `rotated_at`.

Sealed secret envelopes for DB passwords are opaque strings produced by the secret port; persistence into project rows/columns is **S0043**.

## Consequences

- S0043 registry API reads/writes these tables and calls the secret port; no second database URL for control plane in v1.
- Operators backing up Studio must treat `JORD_MASTER_KEY` like a root credential (runbook later under security pass).
- Migrating to a dedicated control-plane DB later is a new ADR; table names stay stable so a dump/restore path is possible.
- Rejected options (a–c store, a–b KMS/keyring) stay documented so Studio v2 cards do not reopen the debate.

## Links

- Plan card: [[../../../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]
- Feature: [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]]
- As-built Studio: [[README]]
- Related ADR style: [[../apis/ADR-functions-v2]]
