---
title: "jord-F0023 — Studio shell v2 (contextual sidebar + right inspector)"
feature_id: jord-F0023
description: "Three-pane Studio layout: primary nav, ordered table-editor sidebar (schema picker, new table, search/filter, table list), workspace tabs, right drawer over a dimmed + blurred backdrop"
created: 2026-10-28
updated: 2026-11-01
tags:
  - feature
  - jord
  - todo
  - jord-F0023
  - studio
  - shell
  - layout
---

# jord-F0023 — Studio shell v2

> **Status:** todo · **Id:** `jord-F0023` · Index: [[../INDEX]] · Current shell: `apps/jord-studio/src/lib/studio-nav.ts` · [[../../../tech_space/jord/studio/README]]

## What

Replace the single left nav with a **three-pane workspace** that keeps the current menu and adds a section-aware second column plus a right-hand task drawer.

| Pane | Content | Behavior |
|------|---------|----------|
| **Primary nav** (left) | Existing `STUDIO_NAV` groups (Data · Runtime · APIs · Database · Help) + project switcher | Icon-collapsible at narrow widths |
| **Contextual sidebar** (beside nav) | Changes with the active menu: for the table editor it is a fixed four-part column (schema picker · new table · search/filter · table list); for Runtime jobs, APIs, SQL, Users it mirrors those lists | Collapsible, resizable, remembers width/state per project |
| **Content** (center) | The page itself | Breadcrumb header with project + section |
| **Inspector** (right) | Create table, insert row, edit record, policy editor, API details, credentials reveal | Opens/closes; backdrop dims and blurs the content; ESC / click-away closes; focus trapped; deep-linkable |

Rules:

- Apolyx primitives only (`NavList`, `Sheet`/inspector, `Field`, `Tabs`, `Input`) — no local overlays.
- Sidebar state is URL-addressable where it matters (`?table=…`, `?inspector=policies`), so a refresh restores the screen.
- Below tablet width the contextual sidebar becomes a sheet and the inspector becomes a full-height sheet.
- The inspector never covers the primary nav, and the content pane keeps its scroll position while the drawer is open.

## Table editor sidebar (order)

The contextual sidebar for the **Tables / records editor** menu is one column, always in this order:

1. **Schema picker** — dropdown at the very top (details below).
2. **+ Add new table** — full-width action under the picker; opens the create-table inspector in the chosen schema.
3. **Search for tables** + **filter** — one search field (name match) and a filter control (has rows / empty / tracked / with policies / table kind).
4. **Table list** — scrollable rows grouped under the chosen schema; each row shows name, row estimate, and badges (tracked, policy, error). Clicking a row **opens the table on a workspace tab**; the active row stays highlighted.

Empty state: if a schema has no tables, the list shows an inline "No tables in this schema" with the add-table action repeated. Search and filter never hide the schema picker or the add action.

## Schema picker (table editor sidebar)

The contextual sidebar for the **Tables / records editor** menu starts with a **schema dropdown** above the table list.

| Aspect | Detail |
|--------|--------|
| Options | Schemas reported by introspection for the active project (Postgres). Default is the project's default schema (`public`). |
| All schemas | Optional `All schemas` entry — lists tables qualified as `schema.table` and disables table-name-only actions when a name collides |
| Scope | The dropdown scopes the table list, its filter/search, and downstream pages (`/tables/[schema]/[name]` or `?schema=`) |
| Persistence | Selection is remembered per project (and reflected in the URL), so reload and deep links keep it |
| libSQL / Turso | No schemas today — the control renders a single read-only `main` value instead of a fake list |
| Non-default schema | A small badge/qualifier shows in the table header so `public.users` and `auth.users` are never confused |
| Counts | Each option shows its table count; empty schemas are still selectable |

Server dependency: the adapter today filters Postgres metadata to `public` (`elements/jord/src/adapter/postgres.ts`). Listing schemas, qualifying introspected tables, and accepting a schema on DDL/records routes is part of this intent — the dropdown must not be UI-only.

## Workspace tabs

A tab bar sits above the content pane and holds open surfaces (tables first, then other screens that opt in).

| Behavior | Detail |
|----------|--------|
| Open | Clicking a table in the sidebar opens it in a new tab; clicking the same table focuses its existing tab instead of duplicating |
| Close | Per-tab close button, middle-click, and a close-all/close-others menu; closing the active tab activates the neighbor |
| Reorder | Drag to reorder; order persists per project |
| Overflow | Horizontal scroll with a tab overflow menu at narrow widths |
| State | Each tab keeps its own scroll, filters, column view, and open inspector; switching tabs restores them |
| URL | Active tab is reflected in the URL, and opening a deep link creates/focuses the matching tab on load |
| Persistence | Open tabs and their order survive reload (per project); an invalid/deleted table tab closes with a notice |
| Keyboard | `Ctrl/Cmd+W` closes the active tab, `Ctrl/Cmd+Tab` cycles (documented, non-conflicting with browser shortcuts) |
| Same name, different schema | Tabs are keyed by `schema.table`, with the schema shown when it is not the default |

## Acceptance

## Acceptance

1. Every menu section has a defined contextual sidebar (documented in the nav config, not ad-hoc in pages).
2. Create-table and insert-row work entirely from the inspector with the backdrop open; keyboard-only path works.
3. Refresh restores active project, section, selected table, and open inspector.
4. No layout shift when the drawer opens; content behind is visually dimmed + blurred.
5. The table-editor sidebar shows a schema dropdown; switching it re-scopes the table list/search, survives reload, and `public.users` vs `auth.users` render distinctly.
6. On a libSQL project the schema control shows a single `main` value and cannot be changed.
7. Sidebar order is schema picker → add new table → search/filter → table list, and search/filter never hides the first two controls.
8. Opening three tables creates three tabs with independent scroll/filter state; closing and reordering them survives reload, and a reload with `?table=` focused reuses the existing tab.

## Overlap

| Id | Change |
|----|--------|
| [[../done/jord-F0012-studio\|jord-F0012]] | Replaces the single-pane shell; screens themselves keep their routes |
| [[jord-F0025-tables-workspace-v2\|jord-F0025]] | Consumes the right inspector for policies / API details; obeys the schema picker; each table opens as a tab |
| [[../done/jord-F0004-schema\|jord-F0004]] | Introspection is public-only today — schema listing/qualification extends it |
| [[jord-F0021-projects-provisioning\|jord-F0021]] | Supplies project switcher and scoped routes |

## Out of scope

Command palette · theming changes · drag-to-dock panels · split-pane (side-by-side) tabs · cross-project tabs.

## Plan tasks

| Task | Est. | Status |
|------|------|--------|
| [[../../../plan/Jord/phase-03/done/S0046-three-pane-shell\|S0046]] — three-pane shell | 2.5–3 h | **done** 2026-11-01 |
| [[../../../plan/Jord/phase-03/S0047-contextual-sidebar\|S0047]] — contextual sidebar | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0048-right-inspector\|S0048]] — right inspector drawer | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0049-schema-scoped-introspection\|S0049]] — server schema scope | 2.5–3 h | todo |
| [[../../../plan/Jord/phase-03/S0050-schema-picker-ui\|S0050]] — schema picker + table list | 2–3 h | todo |
| [[../../../plan/Jord/phase-03/S0051-workspace-tabs\|S0051]] — workspace tabs | 2.5–3 h | todo |

Queue: [[../../../plan/Jord/phase-03/README]].
