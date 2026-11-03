---title: "Status — complete vs remaining"
description: "Jord phase-01 shipped; phase-02 accepted; phase-02.75 closed; phase-03 active (S0034–S0069; next S0070); Functions runtime still gated"
created: 2026-09-19
updated: 2026-11-02
tags:
  - report
  - status
  - jord
  - phase-01
  - phase-02
  - phase-03
---

# Status

Last updated: 2026-11-03 · Living map: [[../brain/00-Docs-Brain]] · Last ship: **S0069 auth settings store + config API** · Prior: **S0068** Studio bucket UI · **S0065** SQL results/explain/cancel · **S0064**–**S0034** · **phase-02.75 closed** [[../plan/Jord/phase-02.75/README]] · **Phase-01 closed** · **Phase-02 accepted** · Closeout: [[../plan/Jord/phase-02.5/README]] · Shipped review: [[Jord-implemented-review]] · Phase-02 task rollup: [[../plan/Jord/phase-02/00-task-rollup]]

## Implemented

- **Jord phase-01 (S0001–S0020)** — matrix in [[Jord-implemented-review]] · capabilities [[../feature_list/Jord/done/README]] · as-built [[../tech_space/jord/README]]
- Plans archive: [[../plan/Jord/phase-01/README]]
- **`@altr/apolyx`** through **S0005** · Apolyx-first · screenshots [[../tech_space/ui-kit/assets]]
- **Jord-S0027** — `.github/workflows/jord.yml` (`jord` + `jord-postgres` with MinIO) · local CI mirror green 2026-10-26 · branch protection still a one-shot admin step · [[../tech_space/jord/overview/README#ci]] · card [[../plan/Jord/phase-02/Jord-S0027/README]]
- **Jord-S0021-A/B/ADR/C** through **Jord-S0026** — see [[../plan/Jord/phase-02/00-task-rollup]]
- **Phase-02.5 (S0030–S0033)** — live Postgres gate, transactional outbox, row scope · [[../plan/Jord/phase-02.5/README]]
- **Phase-02.75** — B1–B5, B8, C1 done; B6/B7 → phase-03; C2 secret-gated / manual-only · [[../plan/Jord/phase-02.75/README]]
- **Phase-03 S0034–S0041 / jord-F0013** — archived [[../plan/Jord/phase-03/done/README]] · as-shipped [[../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]] · writes concurrency [[../tech_space/jord/writes/README]] · OTel [[../tech_space/jord/overview/README#opentelemetry-s0039]] · backup drill [[../tech_space/jord/overview/README#backup--restore-drill-s0040]] · Docker deploy [[../tech_space/jord/overview/README#dockerfile--compose-deploy-s0041]]
- **Phase-03 S0042 / jord-F0021 (partial)** — control-plane ADR + migrations + AES-GCM secret port · [[../tech_space/jord/studio/ADR-control-plane-store]] · card [[../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]
- **Phase-03 S0043 / jord-F0021 (partial)** — `/admin/projects` registry + keys + connect test · [[../tech_space/jord/studio/README#control-plane-store-s0042--registry-api-s0043--studio-wizard-s0044]] · card [[../plan/Jord/phase-03/done/S0043-project-registry-api|S0043]]
- **Phase-03 S0044 / jord-F0021 (partial)** — Studio `/projects` list + New project wizard + one-time key reveal · [[../tech_space/jord/studio/README#studio-create-flow-s0044]] · card [[../plan/Jord/phase-03/done/S0044-new-project-wizard|S0044]]
- **Phase-03 S0045 / jord-F0021 (partial)** — `/p/[project]/…` screens, `jord_project` cookie, header switcher, BFF fail-closed · [[../tech_space/jord/studio/README#project-scoped-routes-s0045]] · card [[../plan/Jord/phase-03/done/S0045-project-scoped-routes|S0045]]
- **Phase-03 S0046 / jord-F0023 (partial)** — three-pane shell + nav `contextual` + inspector overlay frame · [[../tech_space/jord/studio/README#three-pane-shell-s0046]] · card [[../plan/Jord/phase-03/done/S0046-three-pane-shell|S0046]]
- **Phase-03 S0047 / jord-F0023 (partial)** — contextual sidebars for Tables/Jobs/APIs + shared sidebar list primitive + resize/persist/URL selection · [[../tech_space/jord/studio/README#contextual-sidebars-s0047]] · card [[../plan/Jord/phase-03/done/S0047-contextual-sidebar|S0047]]
- **Phase-03 S0048 / jord-F0023 (partial)** — right inspector host + `?inspector=` deep links; migrate/create/detail panels · [[../tech_space/jord/studio/README#right-inspector-s0048]] · card [[../plan/Jord/phase-03/done/S0048-right-inspector|S0048]]
- **Phase-03 S0049 / jord-F0023 (partial)** — `GET /schema/schemas`, `?schema=` on introspection/DDL/rows/table-API; migration `0011` schema_name on tracked + RLS tables · [[../tech_space/jord/schema/README]] · card [[../plan/Jord/phase-03/done/S0049-schema-scoped-introspection|S0049]]
- **Phase-03 S0050 / jord-F0023 (partial)** — Data sidebar schema picker + scoped table list + create-table inspector stub · [[../tech_space/jord/studio/README#schema-picker--scoped-table-list-s0050]] · card [[../plan/Jord/phase-03/done/S0050-schema-picker-ui|S0050]]
- **Phase-03 S0051 / jord-F0023 (partial)** — workspace tabs (`schema.table` keys, URL `?tabs=&active=`, per-project persist) · [[../tech_space/jord/studio/README#workspace-tabs-s0051]] · card [[../plan/Jord/phase-03/done/S0051-workspace-tabs|S0051]]
- **Phase-03 S0052 / jord-F0024 (partial)** — dialect type registry (`toSql`/`fromSql`, custom read-only, migrate via registry) · [[../tech_space/jord/schema/README#type-registry-s0052]] · card [[../plan/Jord/phase-03/done/S0052-type-registry|S0052]]
- **Phase-03 S0053 / jord-F0024 (partial)** — column settings + server-side validation (422 field errors, `confirm` on unsafe DDL, `jord_column_settings`) · [[../tech_space/jord/schema/README#column-settings--validation-s0053]] · card [[../plan/Jord/phase-03/done/S0053-column-settings|S0053]]
- **Phase-03 S0054 / jord-F0024 (partial)** — generated id strategies (uuid v4/v7, ULID, nanoid, cuid2, identity/serial) · [[../tech_space/jord/schema/README#generated-id-strategies-s0054]] · card [[../plan/Jord/phase-03/done/S0054-id-strategies|S0054]]
- **Phase-03 S0055 / jord-F0024 (partial)** — FK / relationship editor (schema-qualified targets, ON DELETE, cardinality, Studio picker) · [[../tech_space/jord/schema/README#foreign-keys--relationships-s0055]] · card [[../plan/Jord/phase-03/done/S0055-fk-relationship-editor|S0055]]
- **Phase-03 S0056 / jord-F0025 (partial) + apolyx-F0008 (partial)** — Apolyx DataGrid column ops, typed filters, quick search, named per-table views in Studio · [[../tech_space/jord/studio/README#tables-datagrid--saved-views-s0056]] · card [[../plan/Jord/phase-03/done/S0056-grid-column-ops|S0056]]
- **Phase-03 S0057 / jord-F0025 (partial) + apolyx-F0008 (partial)** — insert/duplicate/delete/bulk delete, fetch-more paging + `total`, DataGrid multi-select, 10k virtualization · [[../tech_space/jord/studio/README#tables-row-ops--fetch-more-s0057]] · card [[../plan/Jord/phase-03/done/S0057-row-ops-pagination|S0057]]
- **Phase-03 S0058 / jord-F0025 (partial) + apolyx-F0008 (partial)** — DataGrid inline edit, optimistic `old` CAS PATCH, live merge that skips the editing cell · [[../tech_space/jord/studio/README#tables-inline-edit--live-merge-s0058]] · card [[../plan/Jord/phase-03/done/S0058-inline-edit-live-sync|S0058]]
- **Phase-03 S0059 / jord-F0025 (wave E closed)** — per-table Policies + APIs inspector drawers (`?inspector=policies|apis`) · [[../tech_space/jord/studio/README#tables-policies--apis-drawers-s0059]] · card [[../plan/Jord/phase-03/done/S0059-policies-apis-drawers|S0059]]
- **Phase-03 S0060 / jord-F0027 (partial)** — per-table relationships view (incoming/outgoing, URL re-center, constraint detail) · [[../tech_space/jord/schema/README#per-table-relationships-view-s0060]] · card [[../plan/Jord/phase-03/done/S0060-table-relationships-view|S0060]]
- **Phase-03 S0061 / jord-F0027 (partial)** — ERD canvas (pan/zoom/fit, multi-select drag, orthogonal FK lines, snap + guides; 100×500 build ~3.4 ms) · [[../tech_space/jord/schema/README#erd-canvas-s0061--s0062]] · card [[../plan/Jord/phase-03/done/S0061-erd-canvas|S0061]]
- **Phase-03 S0062 / jord-F0027 (wave F closed)** — layout persist (`jord_erd_layouts`), autosave, auto-layout + undo, schema sync, FK drag → column settings, SVG/PNG export · [[../tech_space/jord/schema/README#erd-canvas-s0061--s0062]] · card [[../plan/Jord/phase-03/done/S0062-canvas-layout|S0062]]
- **Phase-03 S0063 / jord-F0028 (partial)** — Apolyx `SqlEditor` (lazy Monaco, dialect `sql`/`pgsql`), project-scoped completion (tables, typed columns, FK joins), find/replace, multi-cursor, format document; Monaco in 5 lazy chunks, route first load 177 kB · [[../tech_space/jord/studio/README#sql-editor-s0024--s0065]] · kit [[../tech_space/ui-kit/README]] · card [[../plan/Jord/phase-03/done/S0063-monaco-sql-editor|S0063]]
- **Phase-03 S0064 / jord-F0028 (partial)** — query tabs (dirty guard + localStorage), `jord_saved_queries` CRUD, audit-backed `/sql/history`, Queries sidebar · [[../tech_space/jord/studio/README#sql-editor-s0024--s0065]] · card [[../plan/Jord/phase-03/done/S0064-query-tabs-history|S0064]]
- **Phase-03 S0065 / jord-F0028 (wave G closed)** — DataGrid results + CSV/JSON visible export, explain plan tree, `POST /sql/cancel`, timeout/rowCap guards · [[../tech_space/jord/studio/README#sql-editor-s0024--s0065]] · card [[../plan/Jord/phase-03/done/S0065-results-explain-cancel|S0065]]
- **Phase-03 S0066 / jord-F0029 (partial)** — `jord_buckets` registry, `resolveBucket` port cache, per-bucket size/MIME/TTL, env fallback · [[../tech_space/jord/blobs/README]] · card [[../plan/Jord/phase-03/done/S0066-bucket-registry|S0066]]
- **Phase-03 S0067 / jord-F0029 (partial)** — `/admin/buckets` CRUD + probe + rotate/pause; AES-GCM sealed credentials; no secrets in JSON · [[../tech_space/jord/blobs/README]] · card [[../plan/Jord/phase-03/done/S0067-bucket-config-api|S0067]]
- **Phase-03 S0068 / jord-F0029 (wave H closed)** — Studio bucket sidebar + test-gated wizard, object upload/search/preview/download/signed URL/delete, settings tab with limits, access, rotation and pause/resume · [[../tech_space/jord/studio/README#storage-buckets-s0066--s0067--s0068]] · card [[../plan/Jord/phase-03/done/S0068-storage-studio-ui|S0068]]
- **Phase-03 S0069 / jord-F0030 (partial, wave I)** — `jord_auth_settings` + `GET/PATCH /admin/auth/settings`; signup gate, autoconfirm, password policy, fail-closed redirect allowlist, per-endpoint rate limits, session TTL, `jord_logs` audit · [[../tech_space/jord/auth/README#auth-settings-store-s0069]] · card [[../plan/Jord/phase-03/done/S0069-auth-settings-store|S0069]]

## In progress

- **Phase-03** — **Active single-task queue**: [[../plan/Jord/phase-03/README]] — **63 cards, S0034–S0096**, waves A–P. **Wave A done** (S0034–S0041 / [[../feature_list/Jord/done/jord-F0013-production-ops|jord-F0013]]). **Wave B done** ([[../plan/Jord/phase-03/done/S0042-control-plane-store-adr|S0042]]–[[../plan/Jord/phase-03/done/S0045-project-scoped-routes|S0045]]). **Wave C done** ([[../plan/Jord/phase-03/done/S0046-three-pane-shell|S0046]]–[[../plan/Jord/phase-03/done/S0051-workspace-tabs|S0051]]). **Wave D closed** ([[../plan/Jord/phase-03/done/S0052-type-registry|S0052]]–[[../plan/Jord/phase-03/done/S0055-fk-relationship-editor|S0055]]). **Wave E closed** ([[../plan/Jord/phase-03/done/S0056-grid-column-ops|S0056]]–[[../plan/Jord/phase-03/done/S0059-policies-apis-drawers|S0059]]). **Wave F closed** ([[../plan/Jord/phase-03/done/S0060-table-relationships-view|S0060]]–[[../plan/Jord/phase-03/done/S0062-canvas-layout|S0062]] / [[../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]]). **Wave G closed** ([[../plan/Jord/phase-03/done/S0063-monaco-sql-editor|S0063]]–[[../plan/Jord/phase-03/done/S0065-results-explain-cancel|S0065]] / [[../feature_list/Jord/todo/jord-F0028-sql-editor-v2|jord-F0028]]). **Wave H closed** ([[../plan/Jord/phase-03/done/S0066-bucket-registry|S0066]]–[[../plan/Jord/phase-03/done/S0068-storage-studio-ui|S0068]] / [[../feature_list/Jord/todo/jord-F0029-storage-buckets|jord-F0029]]). **Wave I started** ([[../plan/Jord/phase-03/done/S0069-auth-settings-store|S0069]] / [[../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]]). **Next:** [[../plan/Jord/phase-03/S0070-auth-console-users|S0070]] (auth console shell + Users). Open features: [[../feature_list/Jord/todo/jord-F0014-typed-dx|jord-F0014]]–[[../feature_list/Jord/todo/jord-F0030-auth-console|jord-F0030]]. Feature index: [[../feature_list/Jord/INDEX]].
- **S0027 branch protection** — ops only; commands on the S0027 card. Not open product debt.

## Gate — do not implement yet

- **Functions v2 runtime** — S0026 ADR recommends `worker_threads`. **Do not ship** until approved. Feature: [[../feature_list/Jord/todo/jord-F0015-functions-runtime|jord-F0015]].

## Environment caveats

_(Postgres + MinIO exercised locally 2026-10-26. Hosted `libsql://` live test runs only when Turso secrets are set; atomicity is proven every run via the forced interactive path. Branch protection is admin.)_

## Planned (repo)

Feature map: [[../feature_list/Jord/README]] · **done/** [[../feature_list/Jord/done/README]] · **todo/** [[../feature_list/Jord/todo/README]] · Phase-03 tasks: [[../plan/Jord/phase-03/README]] · Queue hub: [[../plan/Jord/README]] · Task template: [[../agents/templates/plan-task]] · Phase-02 rollup: [[../plan/Jord/phase-02/00-task-rollup]]

**Studio v2 intent + plan cards 2026-10-28** (every feature carded in [[../plan/Jord/phase-03/README]]): [[../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]] projects & provisioning · [[../feature_list/Jord/todo/jord-F0022-project-dashboard|F0022]] dashboard · [[../feature_list/Jord/todo/jord-F0023-studio-shell-v2|F0023]] shell v2 · [[../feature_list/Jord/todo/jord-F0024-column-model-v2|F0024]] column model · [[../feature_list/Jord/todo/jord-F0025-tables-workspace-v2|F0025]] tables workspace · [[../feature_list/Jord/todo/jord-F0026-live-data-client|F0026]] live client data · [[../feature_list/Jord/todo/jord-F0027-relationship-canvas|F0027]] ERD canvas · [[../feature_list/Jord/todo/jord-F0028-sql-editor-v2|F0028]] SQL editor v2 · [[../feature_list/Jord/todo/jord-F0029-storage-buckets|F0029]] storage buckets & providers · [[../feature_list/Jord/todo/jord-F0030-auth-console|F0030]] auth console · grid primitive [[../feature_list/ui-kit/apolyx-F0008-datagrid|apolyx-F0008]].

Soft leftovers: [[../feature_list/Jord/todo/jord-F0020-soft-leftovers|jord-F0020]] · Artemis · Tia

## Remaining (Apolyx)

[[../feature_list/ui-kit/01-apolyx-s0001-carryovers]]
