---
title: "S0062 — canvas layout persistence, auto-layout and FK drag"
description: "Save node positions per project with autosave, auto-layout, sync diffing on schema change, drag-to-create FK with confirm, SVG/PNG export"
created: 2026-10-28
updated: 2026-11-02
tags:
  - plan
  - jord
  - phase-03
  - task
  - S0062
  - done
---

# S0062 — canvas layout persistence, auto-layout and FK drag

> **Status:** **done** 2026-11-02 · **Depends on** [[S0061-erd-canvas|S0061]] + [[S0042-control-plane-store-adr|S0042]] · **Phase:** [[../README]] · Parent: [[../../../../feature_list/Jord/todo/jord-F0027-relationship-canvas|jord-F0027]] · After ship: [[../../../../tech_space/jord/schema/README]]

## Routing (who / how long / which model)

| | |
|--|--|
| **Suggested agent** | mimir → **apollo** (canvas) + **saga** (layout storage) |
| **Companion skills** | `.agents/skills/apollo/` · `.agents/skills/graft/` |
| **Suggested model** | `claude-sonnet-5-5-high` |
| **Est. time** | **2.5–3 h** |
| **Parallel?** | **No** |

## Goal

Node positions persist per project (control plane, not the database), autosaving with an unsaved indicator; auto-layout (grid or force) gives a first view; a schema sync adds new tables near the viewport and removes dropped ones without moving the rest; dragging a column handle onto another table's PK proposes an FK through the column model; export SVG/PNG works.

## Done when

- [x] Positions survive reload per project and per schema
- [x] Auto-layout works and is reversible (undo to previous positions)
- [x] New table appears near the viewport; dropped table disappears without moving others
- [x] Canvas FK creation appears in the column editor; invalid target rejected
- [x] Export produces a usable SVG/PNG
- [x] Proof pasted

## Proof

| Date | Command | Result |
|------|---------|--------|
| 2026-11-02 | `pnpm --filter @altr/jord-server exec vitest run src/projects/projects.test.ts src/policies/part-c.test.ts` | **25 passed** · 2 skipped · S0062 layout round-trip (id + slug) green · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio exec node --import tsx --test src/lib/studio-erd-layout.test.ts src/lib/studio-erd-canvas.test.ts` | **12 passed** · exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-studio typecheck` | exit 0 |
| 2026-11-02 | `pnpm --filter @altr/jord-server typecheck` | exit 0 |

## After ship

| Update | Path |
|--------|------|
| tech_space | `Docs/tech_space/jord/schema/README.md` |
| Queue | [[../README]] |
