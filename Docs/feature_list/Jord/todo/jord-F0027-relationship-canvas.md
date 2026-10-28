---
title: "jord-F0027 — relationship explorer & ERD canvas"
feature_id: jord-F0027
description: "Per-table relationship view plus a Figma-like free canvas for all tables: pan, zoom, drag, save layout, relationship lines"
created: 2026-10-28
updated: 2026-10-28
tags:
  - feature
  - jord
  - todo
  - jord-F0027
  - studio
  - schema
  - canvas
---

# jord-F0027 — relationship explorer & ERD canvas

> **Status:** todo · **Id:** `jord-F0027` · Index: [[../INDEX]] · Existing visualizer: `/schema` · [[../../../tech_space/jord/schema/README]]

## What

Two related views:

### 1. Per-table relationships

Opened from the Tables page or the contextual sidebar: the selected table in the center, incoming (referenced-by) and outgoing (references) foreign keys around it, with cardinality labels. Click a neighbor to re-center; click a relation to inspect the constraint and its `ON DELETE` / `ON UPDATE` behavior.

### 2. Full ERD canvas

| Capability | Detail |
|------------|--------|
| Canvas | Free 2-axis pan, scroll, and zoom (wheel + buttons + fit-to-view); infinite grid background |
| Nodes | One card per table: name, key columns, type badges; selected/hover/focused states; multiple selection |
| Relations | Lines with cardinality (1—1, 1—N, N—M) routed around nodes, highlighted when a node is selected |
| Drag | Move nodes freely, multi-select drag, alignment guides, snap-to-grid toggle |
| Layout | Auto-layout (force/grid) plus **save layout** per project; autosave with unsaved-changes indicator |
| Sync | Introspection on open + manual refresh; new tables appear near the cursor; dropped tables disappear without disturbing the rest of the layout |
| Edits | Drag from a column handle to another table's PK to propose an FK (confirm dialog → [[jord-F0024-column-model-v2|schema write]]); layout edits never touch schema |
| Share | Export SVG/PNG |

Layout coordinates are stored in the **control plane**, not in the project database — schema stays the single source of truth for structure, layout is presentation only.

## Acceptance

1. Pan, zoom, scroll in both axes, and node drag all work; layout survives reload per project.
2. 100 tables / 500 relations stays interactive (60 fps target, measured).
3. Creating or dropping a table in the schema editor updates the canvas on sync without resetting other node positions.
4. An FK proposed on the canvas appears in the column editor and rejects an invalid target.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0004-schema\|jord-F0004]] | Reuses introspection; do not add a second schema reader |
| [[jord-F0024-column-model-v2\|jord-F0024]] | Relations and cardinality come from the column model |
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Layout persistence lives with the project record |
| [[jord-F0023-studio-shell-v2\|jord-F0023]] | Canvas is a full-bleed page inside the shell (contextual sidebar can collapse) |

## Out of scope

Diagram editing of table definitions beyond FK creation · real-time multi-user cursors · importing external ERDs.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/S0060-table-relationships-view\|S0060]] — per-table relationships | 1.5–2 h | todo |
| [[../../../plan/Jord/phase-03/S0061-erd-canvas\|S0061]] — ERD canvas | 3 h | todo |
| [[../../../plan/Jord/phase-03/S0062-canvas-layout\|S0062]] — layout + FK drag + export | 2.5–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
