---
title: "plan/Jord/phase-03 — single-task queue"
description: "Phase-03 queue: one file per AI task, 63 cards across production ops, Studio v2, storage, auth, table API and security"
created: 2026-10-27
updated: 2026-11-03
tags:
  - plan
  - jord
  - phase-03
  - readme
---

# plan / Jord / phase-03

> **One markdown file = one task for one AI session.** Features: [[../../../feature_list/Jord/INDEX]] (`jord-F####`). Template: [[../../../agents/templates/plan-task]]. Hub: [[../README]]. Completed cards: [[done/README]].

**Queue status (2026-11-03):** **S0034–S0089 + S0093–S0096 done (S0090–S0091 gated, S0092 needs an authorized target)** — wave A (production ops / [[../../../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]]) closed; wave B ([[done/S0042-control-plane-store-adr|S0042]]–[[done/S0045-project-scoped-routes|S0045]]) closed; wave C closed ([[done/S0046-three-pane-shell|S0046]]–[[done/S0051-workspace-tabs|S0051]]); wave D ([[done/S0052-type-registry|S0052]]–[[done/S0055-fk-relationship-editor|S0055]]) closed; wave E closed ([[done/S0056-grid-column-ops|S0056]]–[[done/S0059-policies-apis-drawers|S0059]]); wave F closed ([[done/S0060-table-relationships-view|S0060]]–[[done/S0062-canvas-layout|S0062]] / [[../../../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]]). Wave G closed ([[done/S0063-monaco-sql-editor|S0063]]–[[done/S0065-results-explain-cancel|S0065]] / [[../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]]). Wave H closed ([[done/S0066-bucket-registry|S0066]]–[[done/S0068-storage-studio-ui|S0068]] / [[../../../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]]). Archived under [[done/README|done/]]. Wave I in progress ([[done/S0069-auth-settings-store|S0069]]–[[done/S0076-sessions-claims|S0076]] / [[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] + [[../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]]); next open card: [[S0077-policy-tester|S0077]] (wave I). **63 cards** cover every open Jord feature — [[../../../feature_list/Jord/todo/jord-F0014-typed-dx|F0014]]…[[../../../feature_list/Jord/todo/jord-F0015-functions-runtime|F0015]] and [[../../../feature_list/Jord/todo/jord-F0016-auth-v2|F0016]]…[[../../../feature_list/Jord/todo/jord-F0030-auth-console|F0030]], plus the Studio v2 wave (F0021–F0030). The only intent **not** carded is the soft backlog [[../../../feature_list/Jord/todo/jord-F0020-soft-leftovers|jord-F0020]] — promote it into a new `jord-F####` first.

## How to run a task

1. Open the next **todo** card in wave order (A → P). Do not skip a card a later one depends on.
2. Follow its **Routing** table (agent · skills · model · estimate).
3. Do **only** that card's in-scope steps. Do not expand into the next feature id.
4. Paste proof into the card. Mark status **done**. Move the file to [[done/README|done/]].
5. Call **docs_man** to update the matching `tech_space/jord/<category>/` (+ feature_list `done/` if the contract changed).

```mermaid
flowchart TD
  FL[feature_list jord-F0013+] --> Q[phase-03 queue]
  Q --> W[wave A → P]
  W --> T[one card]
  T -->|one AI session| CODE[code + tests]
  CODE --> TS[tech_space category]
  CODE --> CARD[tick card + proof]
  CARD --> Q
```

## Delivery waves

Order inside a wave is the recommended sequence; ids are **stable** and never renumbered.

```mermaid
flowchart LR
  A[A ops<br/>S0034–S0041] --> B[B control plane<br/>S0042–S0045]
  B --> C[C shell + schema picker<br/>S0046–S0051]
  C --> D[D column model<br/>S0052–S0055]
  D --> E[E tables workspace<br/>S0056–S0059]
  D --> F[F ERD canvas<br/>S0060–S0062]
  C --> G[G SQL editor<br/>S0063–S0065]
  B --> H[H storage buckets<br/>S0066–S0068]
  B --> I[I auth console + auth v2<br/>S0069–S0077]
  H --> K[K storage/realtime v2<br/>S0081–S0083]
  A --> K
  K --> L[L live data client<br/>S0084–S0086]
  B --> J[J table API v2<br/>S0078–S0080]
  J --> M[M typed DX<br/>S0087–S0089]
  L --> M
  C --> N[N functions — GATED<br/>S0090–S0091]
  I --> O[O security pass<br/>S0092–S0094]
  B --> P[P dashboard<br/>S0095–S0096]
```

### Wave A — production ops ([[../../../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]] · **closed**)

| # | Id | Task | Est. |
|--:|----|------|------|
| A1 | [[done/S0034-health-probes\|S0034]] | `/health/live` + `/health/ready` | **done** 2026-10-29 |
| A2 | [[done/S0035-structured-json-logs\|S0035]] | Structured JSON request logs | **done** 2026-10-29 |
| A3 | [[done/S0036-shared-rate-limit-idempotency\|S0036]] | Shared rate limit + idempotency in Postgres | **done** 2026-10-29 |
| A4 | [[done/S0037-listen-seq-fanout\|S0037]] | LISTEN/NOTIFY fan-out + shared watermark | **done** 2026-10-29 |
| A5 | [[done/S0038-pg-write-concurrency\|S0038]] | `JORD_PG_WRITE_CONCURRENCY` | **done** 2026-11-01 |
| A6 | [[done/S0039-otel-traces\|S0039]] | OpenTelemetry traces + metrics | **done** 2026-11-01 |
| A7 | [[done/S0040-backup-restore-drill\|S0040]] | Backup + restore drill | **done** 2026-11-01 |
| A8 | [[done/S0041-dockerfile-deploy\|S0041]] | Dockerfile + deploy recipe | **done** 2026-11-01 |

### Wave B — control plane ([[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]])

| # | Id | Task | Est. |
|--:|----|------|------|
| B1 | [[done/S0042-control-plane-store-adr\|S0042]] | Control-plane store + ADR (**decision first**) | **done** 2026-11-01 |
| B2 | [[done/S0043-project-registry-api\|S0043]] | Project registry API + keys + connect test | **done** 2026-11-01 |
| B3 | [[done/S0044-new-project-wizard\|S0044]] | Projects list + New project wizard | **done** 2026-11-01 |
| B4 | [[done/S0045-project-scoped-routes\|S0045]] | `/p/[project]` scoping + switcher | **done** 2026-11-01 |

### Wave C — Studio shell ([[../../../feature_list/Jord/todo/jord-F0023-studio-shell-v2|jord-F0023]])

| # | Id | Task | Est. |
|--:|----|------|------|
| C1 | [[done/S0046-three-pane-shell\|S0046]] | Three-pane shell + nav config | **done** 2026-11-01 |
| C2 | [[done/S0047-contextual-sidebar\|S0047]] | Contextual sidebar per section | **done** 2026-11-01 |
| C3 | [[done/S0048-right-inspector\|S0048]] | Right inspector drawer + deep links | **done** 2026-11-01 |
| C4 | [[done/S0049-schema-scoped-introspection\|S0049]] | Server: schema-scoped introspection/DDL (**unblocks the picker**) | **done** 2026-11-01 |
| C5 | [[done/S0050-schema-picker-ui\|S0050]] | Schema dropdown → add table → search → list | **done** 2026-11-01 |
| C6 | [[done/S0051-workspace-tabs\|S0051]] | Workspace tab bar (one tab per table) | **done** 2026-11-02 |

### Wave D — column model ([[../../../feature_list/Jord/todo/jord-F0024-column-model-v2|jord-F0024]])

| # | Id | Task | Est. |
|--:|----|------|------|
| D1 | [[done/S0052-type-registry\|S0052]] | Dialect type registry + introspection model | **done** 2026-11-02 |
| D2 | [[done/S0053-column-settings\|S0053]] | Column settings + server-side validation | **done** 2026-11-02 |
| D3 | [[done/S0054-id-strategies\|S0054]] | Generated id strategies | **done** 2026-11-02 |
| D4 | [[done/S0055-fk-relationship-editor\|S0055]] | FK / relationship editor (cross-schema) | **done** 2026-11-02 |

### Wave E — tables workspace ([[../../../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|jord-F0025]])

| # | Id | Task | Est. |
|--:|----|------|------|
| E1 | [[done/S0056-grid-column-ops\|S0056]] | DataGrid column ops + filters + saved views | **done** 2026-11-02 |
| E2 | [[done/S0057-row-ops-pagination\|S0057]] | Row ops, bulk delete, paging, 10k rows | **done** 2026-11-02 |
| E3 | [[done/S0058-inline-edit-live-sync\|S0058]] | Double-click edit + optimistic + live merge | **done** 2026-11-02 |
| E4 | [[done/S0059-policies-apis-drawers\|S0059]] | Per-table Policies + APIs drawers | **done** 2026-11-02 |

### Wave F — relationship canvas ([[../../../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]])

| # | Id | Task | Est. |
|--:|----|------|------|
| F1 | [[done/S0060-table-relationships-view\|S0060]] | Per-table relationships view | **done** 2026-11-02 |
| F2 | [[done/S0061-erd-canvas\|S0061]] | ERD canvas: pan, zoom, drag, relations | **done** 2026-11-02 |
| F3 | [[done/S0062-canvas-layout\|S0062]] | Layout persistence, auto-layout, FK drag, export | **done** 2026-11-02 |

### Wave G — SQL editor ([[../../../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]])

| # | Id | Task | Est. |
|--:|----|------|------|
| G1 | [[done/S0063-monaco-sql-editor\|S0063]] | Monaco + schema-aware completion | **done** 2026-11-02 |
| G2 | [[done/S0064-query-tabs-history\|S0064]] | Query tabs, saved queries, history | **done** 2026-11-02 |
| G3 | [[done/S0065-results-explain-cancel\|S0065]] | Results grid, export, explain, cancel | **done** 2026-11-02 |

### Wave H — storage buckets ([[../../../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]])

| # | Id | Task | Est. |
|--:|----|------|------|
| H1 | [[done/S0066-bucket-registry\|S0066]] | `jord_buckets` + per-bucket provider resolution | **done** 2026-11-02 |
| H2 | [[done/S0067-bucket-config-api\|S0067]] | Bucket config API + encrypted credentials + test | **done** 2026-11-02 |
| H3 | [[done/S0068-storage-studio-ui\|S0068]] | Bucket wizard, object browser, settings | **done** 2026-11-03 |

### Wave I — auth ([[../../../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]] + [[../../../feature_list/Jord/todo/jord-F0016-auth-v2|jord-F0016]])

| # | Id | Task | Parent | Est. |
|--:|----|------|--------|------|
| I1 | [[done/S0069-auth-settings-store\|S0069]] | Auth settings store + config API | F0030 | **done** 2026-11-03 |
| I2 | [[done/S0070-auth-console-users\|S0070]] | Auth console shell + Users | F0030 | **done** 2026-11-03 |
| I3 | [[done/S0071-auth-console-sections\|S0071]] | Providers, URL config, JWT, rate limits | F0030 | **done** 2026-11-03 |
| I4 | [[done/S0072-email-templates\|S0072]] | Email templates + test send | F0030 | **done** 2026-11-03 |
| I5 | [[done/S0073-mailer-port\|S0073]] | Real `MailerPort` | F0016 | **done** 2026-11-03 |
| I6 | [[done/S0074-magic-link\|S0074]] | Magic-link sign-in | F0016 | **done** 2026-11-03 |
| I7 | [[done/S0075-oauth-provider\|S0075]] | One OAuth provider (state + PKCE) | F0016 | **done** 2026-11-03 |
| I8 | [[done/S0076-sessions-claims\|S0076]] | Sessions list/revoke + custom claims | F0016 | **done** 2026-11-03 |
| I9 | [[done/S0077-policy-tester\|S0077]] | "Run as user" policy tester | F0016 | **done** 2026-11-03 |

### Wave J — table API v2 ([[../../../feature_list/Jord/todo/jord-F0017-table-api-v2|jord-F0017]])

| # | Id | Task | Est. |
|--:|----|------|------|
| J1 | [[done/S0078-fk-embeds\|S0078]] | FK embeds with per-table policies | **done** 2026-11-03 |
| J2 | [[done/S0079-keyset-pagination\|S0079]] | Keyset pagination | **done** 2026-11-03 |
| J3 | [[done/S0080-bulk-upsert-rpc\|S0080]] | Bulk upsert + RPC | **done** 2026-11-03 |

### Wave K — storage & realtime v2 ([[../../../feature_list/Jord/todo/jord-F0018-storage-realtime-v2|jord-F0018]])

| # | Id | Task | Est. |
|--:|----|------|------|
| K1 | [[done/S0081-multipart-uploads\|S0081]] | Multipart + resumable uploads | **done** 2026-11-03 (1 GiB / MinIO proof gated) |
| K2 | [[done/S0082-image-transforms\|S0082]] | Image transforms (non-native) | **done** 2026-11-03 |
| K3 | [[done/S0083-presence-broadcast\|S0083]] | Presence + broadcast with policy-gated join | **done** 2026-11-03 (two-instance proof gated) |

### Wave L — live data for apps ([[../../../feature_list/Jord/todo/jord-F0026-live-data-client|jord-F0026]])

| # | Id | Task | Est. |
|--:|----|------|------|
| L1 | [[done/S0084-realtime-app-endpoint\|S0084]] | App endpoint: publishable key, snapshot + deltas | **done** 2026-11-03 |
| L2 | [[done/S0085-realtime-reconnect\|S0085]] | Reconnect, resume, ordering, resync | **done** 2026-11-03 |
| L3 | [[done/S0086-live-toggle-snippet\|S0086]] | Live toggle, counters, client snippet | **done** 2026-11-03 (UI not viewed) |

### Wave M — typed DX ([[../../../feature_list/Jord/todo/jord-F0014-typed-dx|jord-F0014]])

| # | Id | Task | Est. |
|--:|----|------|------|
| M1 | [[done/S0087-gen-types-cli\|S0087]] | `jord gen types` | **done** 2026-11-03 |
| M2 | [[done/S0088-typed-client-builder\|S0088]] | Typed table builder in `@altr/jord-client` | **done** 2026-11-03 |
| M3 | [[done/S0089-react-bindings\|S0089]] | React bindings package | **done** 2026-11-03 (no consumer screen yet) |

### Wave N — Functions runtime (**GATED**)

| # | Id | Task | Est. |
|--:|----|------|------|
| N1 | [[S0090-functions-worker-pool\|S0090]] | Worker pool + timeout/memory caps — **do not start** | 3 h |
| N2 | [[S0091-functions-client-logs\|S0091]] | Principal-bound client + logs — **do not start** | 3 h |

Gate: parent [[../../../feature_list/Jord/todo/jord-F0015-functions-runtime|jord-F0015]] + [[../../../tech_space/jord/apis/ADR-functions-v2|ADR-functions-v2]].

### Wave O — security pass ([[../../../feature_list/Jord/todo/jord-F0019-security-pass|jord-F0019]])

| # | Id | Task | Est. |
|--:|----|------|------|
| O1 | [[S0092-strix-pentest\|S0092]] | Authorized Strix pentest + triage | 2–3 h |
| O2 | [[done/S0093-key-rotation-runbook\|S0093]] | Key-rotation runbook + drill | **done** 2026-11-03 |
| O3 | [[done/S0094-dependency-audit-ci\|S0094]] | Dependency audit in CI | **done** 2026-11-03 (9 open findings fail the job) |

### Wave P — project dashboard ([[../../../feature_list/Jord/todo/jord-F0022-project-dashboard|jord-F0022]])

| # | Id | Task | Est. |
|--:|----|------|------|
| P1 | [[done/S0095-project-stats-endpoint\|S0095]] | `GET /admin/projects/:id/stats` | **done** 2026-11-03 |
| P2 | [[done/S0096-dashboard-ui\|S0096]] | Dashboard UI: charts, counters, connect card | **done** 2026-11-03 (not viewed authenticated) |

## Cross-wave dependencies

| Card | Blocked by |
|------|------------|
| [[done/S0043-project-registry-api\|S0043]] | S0042 (store decision) — **done** |
| [[done/S0044-new-project-wizard\|S0044]] | S0043 (registry API) — **done** |
| [[done/S0045-project-scoped-routes\|S0045]] | S0044 (projects UI) — **done** |
| [[done/S0049-schema-scoped-introspection\|S0049]] | — (server only) — **done** |
| [[done/S0050-schema-picker-ui\|S0050]] | S0047, S0049 — **done** |
| [[done/S0056-grid-column-ops\|S0056]] | apolyx-F0008 DataGrid (column-ops slice) — **done** |
| [[done/S0066-bucket-registry\|S0066]] | — **done** |
| [[done/S0068-storage-studio-ui\|S0068]] | [[done/S0067-bucket-config-api\|S0067]] — **done** |
| [[done/S0071-auth-console-sections\|S0071]] | S0069 + S0070 — **done** (OAuth/magic-link provider toggles need S0074/S0075) |
| [[S0090-functions-worker-pool\|S0090]] | status gate |

## Rules

1. Do not reopen phase-01 / 02 / 02.5 / 02.75 for new scope.
2. New work = a new `S00xx-slug.md` here; never a multi-part mega-README. Ids stay stable.
3. If a card grows past ~3 hours or needs two hats coding at once → **split** before implementing.
4. A card marked **gated** is not started until `report/STATUS.md` lifts the gate.
5. Every card ends with `docs_man`: `tech_space/jord/<category>/` update + tick + STATUS if the phase status changed.
