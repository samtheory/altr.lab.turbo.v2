---
title: "Jord feature index (jord-F####)"
description: "Stable feature IDs for Jord intent. Cite these IDs from plan, tech_space, and report."
created: 2026-10-27
updated: 2026-11-01
tags:
  - feature
  - jord
  - index
---

# Jord feature index (`jord-F####`)

> **Cite features by ID** (e.g. `jord-F0013`), not by old P1/P2 labels or path-only links. Hub: [[README]]. Convention: [[../README#feature-ids]].

Ids are **stable**. Do not reuse a retired number; mark status `done` / `todo` / `soft` instead.

## Done (shipped)

A feature is **done** only when its contract landed. **jord-F0013** is **done** (S0034–S0041).

| Id | Slug | Note | Status |
|----|------|------|--------|
| **jord-F0001** | overview | [[done/jord-F0001-overview]] | done |
| **jord-F0002** | dialects | [[done/jord-F0002-dialects]] | done |
| **jord-F0003** | writes | [[done/jord-F0003-writes]] | done |
| **jord-F0004** | schema | [[done/jord-F0004-schema]] | done |
| **jord-F0005** | auth | [[done/jord-F0005-auth]] | done |
| **jord-F0006** | apis | [[done/jord-F0006-apis]] | done |
| **jord-F0007** | jobs | [[done/jord-F0007-jobs]] | done |
| **jord-F0008** | policies | [[done/jord-F0008-policies]] | done |
| **jord-F0009** | realtime | [[done/jord-F0009-realtime]] | done |
| **jord-F0010** | blobs | [[done/jord-F0010-blobs]] | done |
| **jord-F0011** | vectors | [[done/jord-F0011-vectors]] | done |
| **jord-F0012** | studio | [[done/jord-F0012-studio]] | done |
| **jord-F0013** | production-ops | [[done/jord-F0013-production-ops]] | **done** — S0034–S0041 |

## Todo (open — phase-03 + Studio v2)

| Id | Was / theme | Note | Plan tasks |
|----|-----|------|------------|
| **jord-F0014** | P2 | [[todo/jord-F0014-typed-dx]] | [[../../plan/Jord/phase-03/S0087-gen-types-cli\|S0087]] · [[../../plan/Jord/phase-03/S0088-typed-client-builder\|S0088]] · [[../../plan/Jord/phase-03/S0089-react-bindings\|S0089]] |
| **jord-F0015** | P3 | [[todo/jord-F0015-functions-runtime]] | [[../../plan/Jord/phase-03/S0090-functions-worker-pool\|S0090]] · [[../../plan/Jord/phase-03/S0091-functions-client-logs\|S0091]] — **gated** |
| **jord-F0016** | P4 | [[todo/jord-F0016-auth-v2]] | [[../../plan/Jord/phase-03/S0073-mailer-port\|S0073]] · [[../../plan/Jord/phase-03/S0074-magic-link\|S0074]] · [[../../plan/Jord/phase-03/S0075-oauth-provider\|S0075]] · [[../../plan/Jord/phase-03/S0076-sessions-claims\|S0076]] · [[../../plan/Jord/phase-03/S0077-policy-tester\|S0077]] |
| **jord-F0017** | P5 | [[todo/jord-F0017-table-api-v2]] | [[../../plan/Jord/phase-03/S0078-fk-embeds\|S0078]] · [[../../plan/Jord/phase-03/S0079-keyset-pagination\|S0079]] · [[../../plan/Jord/phase-03/S0080-bulk-upsert-rpc\|S0080]] |
| **jord-F0018** | P6 | [[todo/jord-F0018-storage-realtime-v2]] | [[../../plan/Jord/phase-03/S0081-multipart-uploads\|S0081]] · [[../../plan/Jord/phase-03/S0082-image-transforms\|S0082]] · [[../../plan/Jord/phase-03/S0083-presence-broadcast\|S0083]] |
| **jord-F0019** | P7 | [[todo/jord-F0019-security-pass]] | [[../../plan/Jord/phase-03/S0092-strix-pentest\|S0092]] · [[../../plan/Jord/phase-03/S0093-key-rotation-runbook\|S0093]] · [[../../plan/Jord/phase-03/S0094-dependency-audit-ci\|S0094]] |
| **jord-F0021** | studio-v2 | [[todo/jord-F0021-projects-provisioning]] | [[../../plan/Jord/phase-03/done/S0042-control-plane-store-adr\|S0042]] · [[../../plan/Jord/phase-03/done/S0043-project-registry-api\|S0043]] · [[../../plan/Jord/phase-03/done/S0044-new-project-wizard\|S0044]] · [[../../plan/Jord/phase-03/done/S0045-project-scoped-routes\|S0045]] |
| **jord-F0022** | studio-v2 | [[todo/jord-F0022-project-dashboard]] | [[../../plan/Jord/phase-03/S0095-project-stats-endpoint\|S0095]] · [[../../plan/Jord/phase-03/S0096-dashboard-ui\|S0096]] |
| **jord-F0023** | studio-v2 | [[todo/jord-F0023-studio-shell-v2]] | [[../../plan/Jord/phase-03/done/S0046-three-pane-shell\|S0046]] · [[../../plan/Jord/phase-03/done/S0047-contextual-sidebar\|S0047]] · [[../../plan/Jord/phase-03/S0048-right-inspector\|S0048]] · [[../../plan/Jord/phase-03/S0049-schema-scoped-introspection\|S0049]] · [[../../plan/Jord/phase-03/S0050-schema-picker-ui\|S0050]] · [[../../plan/Jord/phase-03/S0051-workspace-tabs\|S0051]] |
| **jord-F0024** | schema-v2 | [[todo/jord-F0024-column-model-v2]] | [[../../plan/Jord/phase-03/S0052-type-registry\|S0052]] · [[../../plan/Jord/phase-03/S0053-column-settings\|S0053]] · [[../../plan/Jord/phase-03/S0054-id-strategies\|S0054]] · [[../../plan/Jord/phase-03/S0055-fk-relationship-editor\|S0055]] |
| **jord-F0025** | studio-v2 | [[todo/jord-F0025-tables-workspace-v2]] | [[../../plan/Jord/phase-03/done/S0056-grid-column-ops\|S0056]] · [[../../plan/Jord/phase-03/S0057-row-ops-pagination\|S0057]] · [[../../plan/Jord/phase-03/S0058-inline-edit-live-sync\|S0058]] · [[../../plan/Jord/phase-03/S0059-policies-apis-drawers\|S0059]] |
| **jord-F0026** | realtime | [[todo/jord-F0026-live-data-client]] | [[../../plan/Jord/phase-03/S0084-realtime-app-endpoint\|S0084]] · [[../../plan/Jord/phase-03/S0085-realtime-reconnect\|S0085]] · [[../../plan/Jord/phase-03/S0086-live-toggle-snippet\|S0086]] |
| **jord-F0027** | schema-v2 | [[todo/jord-F0027-relationship-canvas]] | [[../../plan/Jord/phase-03/S0060-table-relationships-view\|S0060]] · [[../../plan/Jord/phase-03/S0061-erd-canvas\|S0061]] · [[../../plan/Jord/phase-03/S0062-canvas-layout\|S0062]] |
| **jord-F0028** | studio-v2 | [[todo/jord-F0028-sql-editor-v2]] | [[../../plan/Jord/phase-03/S0063-monaco-sql-editor\|S0063]] · [[../../plan/Jord/phase-03/S0064-query-tabs-history\|S0064]] · [[../../plan/Jord/phase-03/S0065-results-explain-cancel\|S0065]] |
| **jord-F0029** | storage | [[todo/jord-F0029-storage-buckets]] | [[../../plan/Jord/phase-03/S0066-bucket-registry\|S0066]] · [[../../plan/Jord/phase-03/S0067-bucket-config-api\|S0067]] · [[../../plan/Jord/phase-03/S0068-storage-studio-ui\|S0068]] |
| **jord-F0030** | auth | [[todo/jord-F0030-auth-console]] | [[../../plan/Jord/phase-03/S0069-auth-settings-store\|S0069]] · [[../../plan/Jord/phase-03/S0070-auth-console-users\|S0070]] · [[../../plan/Jord/phase-03/S0071-auth-console-sections\|S0071]] · [[../../plan/Jord/phase-03/S0072-email-templates\|S0072]] |

## Soft (not numbered sprint work)

| Id | Note | Status |
|----|------|--------|
| **jord-F0020** | [[todo/jord-F0020-soft-leftovers]] | soft — promote into a new F#### when a product asks (**not** carded by design) |

## Next free id

**jord-F0031**
