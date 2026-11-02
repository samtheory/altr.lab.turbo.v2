---
title: "Jord Studio"
description: "Next.js control plane: BFF, session cookie, Apolyx-only UI; S0042–S0058 projects + shell + DataGrid tables + row ops + inline edit"
created: 2026-10-24
updated: 2026-11-02
tags:
  - tech-space
  - jord
  - studio
---

# Jord Studio

> Who: anyone changing `apps/jord-studio`. Product intent: [[../../../feature_list/Jord/done/jord-F0012-studio]] · multi-project [[../../../feature_list/Jord/todo/jord-F0021-projects-provisioning|jord-F0021]]. Server behavior lives in the other categories — this note is only the control plane.

## Why

Operators need tables, jobs, APIs, and files without a SQL shell and without the browser opening `data/jord.db`. The app is a proxy plus screens.

## What

| Piece | Fact |
|-------|------|
| Package | `apps/jord-studio` (`@altr/jord-studio`), Next.js |
| UI | `@altr/apolyx` only. No local Dialog/Table kit |
| Upstream | `JORD_SERVER_URL` default `http://127.0.0.1:8787` |
| Dev | `pnpm dev:jord` then `pnpm dev:jord-studio` (`:3005`) |
| Gate | `/login` sets `jord_session`. `JORD_STUDIO_OPEN=1` skips the gate for local dev |
| Proxy | `src/lib/jord-proxy.ts` — `cache: "no-store"`. Upstream down → **503**. **409** passes through |

`body` on `records` is TEXT. The editor is column fields. A switch may validate JSON; storage is still a string.

## How — screens

Nav config: `apps/jord-studio/src/lib/studio-nav.ts` (`icon` + optional `contextual`). Shell: three-pane `StudioShell` (S0046) — primary `NavList`, contextual sidebar slot, `StudioContent`, overlay `StudioInspector`.

| Screen | Route | Talks to |
|--------|-------|----------|
| Records editor | `/p/[project]/records` | [[../writes/README]] + Live [[../realtime/README]] |
| Tables | `/p/[project]/tables`, `…/tables/[name]` | [[../schema/README]] [[../writes/README]] |
| Schema | `/p/[project]/schema` | [[../schema/README]] |
| Connection | `/p/[project]/database/connection` | [[../dialects/README]] — labels only; **no URL editor** |
| SQL console | `/p/[project]/database/sql` | `POST /sql/execute` — admin; read-only via engine pragma |
| Migrate | `/p/[project]/database/migrate` | `POST /migrate/jobs` — admin; never deletes source |
| Users | `/p/[project]/auth/users` | `GET /admin/users` — disable / revoke |
| Projects | `/projects`, `/projects/new`, `/projects/[id]/edit` | BFF → `GET/POST /admin/projects` · test · rotate · archive · one-time key reveal (control plane, not project-prefixed) |
| Project home | `/p/[project]` | Scoped landing + switcher target |
| Policies / Triggers | `/p/[project]/database/…` | [[../policies/README]] |
| Generated / Function / Custom / Table APIs | `/p/[project]/apis/…` | [[../apis/README]] |
| Jobs / Logs | `/p/[project]/jobs`, `…/logs` | [[../jobs/README]] — logs batch into `jord_logs` |
| Storage | `/p/[project]/storage` | [[../blobs/README]] |
| Vectors | `/p/[project]/vectors` | [[../vectors/README]] |

Legacy unscoped paths (`/tables`, `/records`, …) **redirect** via middleware to `/p/<cookie|default>/…`.

BFF routes live under `apps/jord-studio/src/app/api/` and mirror the server paths.

## SQL console (S0024)

Admin operator only. Read-only default uses a **dedicated** libSQL connection with `PRAGMA query_only=ON` (Postgres: `BEGIN READ ONLY` + `statement_timeout`). Those reads never enter the write queue. Writes require the toggle off and go through `enqueueWrite`. Every statement is audited in `jord_sql_audit`. Raw SQL bypasses the migration runner and, on libSQL, the outbox.

## Migrate wizard (S0024)

File libSQL → Turso or Postgres. Type map: TEXT→text, INTEGER→bigint, REAL→double precision, BLOB→bytea. Skip `jord_vix_*`. Destination URL is accepted once for the job, never returned in JSON, and the source is never deleted.

## Example

```bash
pnpm dev:jord
pnpm dev:jord-studio
```

Sign in as admin, open **SQL console**, run `SELECT 1`, then flip read-only off only when you intend a queued write.

## Control-plane store (S0042) + registry API (S0043) + Studio wizard (S0044) + scoping (S0045)

ADR: [[ADR-control-plane-store]]. **Decision:** project metadata lives in `jord_projects` / `jord_project_keys` on the **server primary** `DATABASE_URL` (never inside a registered project target). Secrets at rest use **AES-256-GCM** + `JORD_MASTER_KEY` (`putSecret` / `getSecret` / `rotate` on `@altr/jord`). Create flow is **register + test** only (no hosted provisioning).

| Piece | Fact |
|-------|------|
| Migration | `0009_control_plane_projects.sql` + `0010_project_db_password_sealed.sql` (libSQL + Postgres) |
| Types | `elements/jord/src/schema/projects.ts` |
| Secret port | `elements/jord/src/control-plane/secret-port.ts` · wired on `createJordApp` as `secrets` (null when master key unset) |
| Registry | `cloud/jord/src/projects/` · mounted at `/admin/projects*` (admin operator only) |
| Keys | `jord_pub_…` / `jord_sec_…` / `jord_bar_…` — SHA-256 hashed in `jord_project_keys`; secret returned **once** on create/rotate |
| Connect test | `POST /admin/projects/test` — ephemeral ping; failed create writes **no** row |
| Archive | `DELETE /admin/projects/:id` → `status=archived`, keys deleted, subsequent GET → **410** |
| Studio UI (S0044) | `apps/jord-studio` — `/projects` list, `/projects/new` wizard, `/projects/[id]/edit`, BFF under `src/app/api/admin/projects/` |
| Studio scoping (S0045) | Screens under `app/p/[project]/…`; cookie `jord_project`; header switcher; BFF fail-closed; slug `default` = env DB |

### Admin project routes

| Method | Path | Notes |
|--------|------|-------|
| GET | `/admin/projects` | List (no passwords / secret keys) |
| POST | `/admin/projects/test` | Connect check only |
| POST | `/admin/projects` | Register + baseline; returns `secret_key` once |
| GET | `/admin/projects/:id` | Detail; **410** if archived |
| PATCH | `/admin/projects/:id` | Notes (active only) |
| DELETE | `/admin/projects/:id` | Archive + revoke keys (never drops target DB) |
| POST | `/admin/projects/:id/rotate-keys` | New key set; secret returned once |

Zero-project / single-DB boots stay valid without `JORD_MASTER_KEY` (registry routes return **503** until the key is set).

### Studio create flow (S0044)

1. Admin opens **Projects → New project**.
2. Name auto-fills slug (editable until submit); engine / target / TLS+user (Postgres) / write-only password / notes.
3. **Test connection** must succeed (client latency shown) before **Create** enables.
4. Create proxies to jord-server; reveal panel shows publishable / secret / barrier keys once with copy + “I stored it” confirm.
5. Continue lands on `/p/[slug]/tables`. Secrets never go in the URL or `localStorage`.

### Project-scoped routes (S0045)

| Piece | Fact |
|-------|------|
| Routes | All former Studio screens live under `apps/jord-studio/src/app/p/[project]/…` |
| Resolve | Layout calls `resolveStudioProject` — slug `default` is synthetic (env `JORD_SERVER_URL`); others via `GET /studio/projects/:slug` (404 unknown, 410 archived) |
| Cookie | `jord_project` set by middleware on `/p/…` and by switcher `POST /api/studio/project-cookie` |
| Switcher | Header `ProjectSwitcher` (Apolyx `Select`) — keeps sub-path when changing slug |
| BFF | `proxyToJord` reads cookie + `x-jord-project`; mismatch → **403** `project_mismatch`; forwards `X-Jord-Project` upstream |
| Catalog | `GET /studio/projects` (any auth) lists active summaries for the switcher |
| Nav | `navForRole(role, projectSlug)` prefixes data/runtime/API/database/help hrefs |

**Note:** Scope is enforced in Studio routing/BFF. Data still hits the primary server DB until a later card fans out connections per project target.

### Three-pane shell (S0046)

| Piece | Fact |
|-------|------|
| Grid | CSS vars `--jord-nav-w` / `--jord-sidebar-w`; primary nav icon-collapsible; contextual column only when active item has `contextual` |
| Slots | `StudioSidebar` · `StudioContent` (`#main`) · `StudioInspector` (overlay + blur; no content reflow) in `studio-panes.tsx` |
| Prefs | `localStorage` key `jord.studio.shell:v1:<projectSlug>` — nav + sidebar collapsed |
| Responsive | Below `lg`: primary nav + contextual sidebar + inspector each use Apolyx `Sheet` |
| Placeholder | Contextual kinds `tables` / `jobs` / `endpoints` / `queries` / `users` / `buckets` show a reserved frame (loading/empty/error ready) |
| A11y | Skip links → nav / sidebar / content |

### Contextual sidebars (S0047)

Real second-column lists for the wired sections; selection is URL-driven and the width/collapse persist per project.

| Piece | Fact |
|-------|------|
| Primitive | `StudioSidebarList` + `SidebarBadge` in `src/components/studio-sidebar-list.tsx` — layout only, no Jord data fetch |
| Tables | `StudioTablesSidebar` (S0050) — see schema picker below |
| Jobs | `StudioJobsSidebar` reads `GET /api/jobs`, status filter + last-run badge, selection drives `?job=` |
| APIs | `StudioEndpointsSidebar` reads `GET /api/apis/generated` + `/api/custom-apis` + `/api/functions`, grouped by Tables/Custom with method badges |
| Mount | `ContextualSidebarMount` in `studio-shell.tsx` registers the active section body into the slot |
| SQL | Reserved `queries` slot; real list is [[../../../plan/Jord/phase-03/S0064-query-tabs-history\|S0064]] |
| Auth | Reserved `users` slot; real list is [[../../../plan/Jord/phase-03/S0070-auth-console-users\|S0070]] |
| Storage | Reserved `buckets` slot; real list is [[../../../plan/Jord/phase-03/S0068-storage-studio-ui\|S0068]] |
| Resize + persist | Drag handle with 12rem–30rem clamp; `sidebarWidth` + `sidebarCollapsed` kept in the S0046 shell prefs |
| Selection | `?table=`, `?job=`, `?endpoint=` rewritten on item click; restored on reload |
| Search | Debounced ~150 ms; `/` focuses, Escape clears |

### Schema picker + scoped table list (S0050)

Data sidebar order is fixed: **schema dropdown → + Add new table → search/filter → table list**. Search/filter never hide the picker or add action.

| Piece | Fact |
|-------|------|
| BFF | `GET /api/schema/schemas` · `GET/POST /api/schema/tables?schema=` (query forwarded upstream) |
| Prefs | `localStorage` `jord.studio.schema:v1:<projectSlug>` + URL `?schema=` (omitted for dialect default) |
| All schemas | Optional `schema=all` — lists `schema.table` labels; add-table disabled in that mode |
| libSQL | Single read-only `main` option (no fake multi-schema list) |
| Add table | Inspector `create-table` + `?schema=` prop · stub form until [[../../../plan/Jord/phase-03/S0052-type-registry\|S0052]] |
| Hotkeys | `/` search · `n` add table |
| Leading slot | `StudioSidebarList` `leading` prop keeps picker + add above search |

### Workspace tabs (S0051)

Tab strip above `StudioContent` when the Data section is active. Keys are always `schema.table` so same-named tables in different schemas never collide.

| Piece | Fact |
|-------|------|
| UI | `WorkspaceTabsStrip` + `WorkspaceTabsProvider` in `src/components/workspace-tabs.tsx` — Apolyx `Button` / `DropdownMenu` / `Badge`; drag reorder; overflow menu |
| Open | Sidebar (or Tables index) click → `openTab`; existing key focuses instead of duplicating |
| Close | Per-tab × · overflow Close/Close others/Close all · `Ctrl/Cmd+W` · `Alt+←/→` reorder |
| URL | `?tabs=public.users,auth.users&active=public.users` + path `/tables/[name]` for the active table; `schema` query when not the dialect default |
| Persist | `localStorage` `jord.studio.tabs:v1:<projectSlug>` — order, active, per-tab `{ offset, scrollY, filters[], columnOrder, columnWidths, hiddenColumns, pinnedColumns, sort, quickSearch, activeViewId, inspector }` |
| Missing | 404 on table info/rows → “Table missing” panel with Close tab |
| Scope | Tables only (records / SQL / functions stay out of the strip) |
| Motion | &lt;150 ms transitions; `useReducedMotion` disables |

### Tables DataGrid + saved views (S0056)

Tables `[name]` renders through `@altr/apolyx` **DataGrid** (not a local grid). Kit owns virtualization, header menu, typed filter builder, and controlled column layout.

| Piece | Fact |
|-------|------|
| Kit | `DataGrid` / `DataGridFilterBuilder` in `elements/ui-kit` · docs `/docs/components/data-grid` · registry `data-grid` |
| Wire-up | `apps/jord-studio/src/components/table-browser.tsx` maps introspected SQL types via `sqlTypeToGridType` |
| Header ops | Sort cycle · hide/show · pin left/right · resize · drag reorder · reset view |
| Filters | Typed operators (text/number/boolean/date/json/fk) + quick search; AND chips above the grid; client-side on the loaded page |
| Tab persist | Filter/sort/layout/quickSearch written into workspace tab state (survives tab switch + reload) |
| Named views | `localStorage` `jord.studio.table-views:v1:<projectSlug>` keyed by `schema.table` — create / rename / update / delete / set default; default applied on tab open |
| Column merge | New columns from DDL append via `mergeColumnLayout` without wiping widths/pins/hidden |
| Out of scope here | Bulk row ops → [[../../../plan/Jord/phase-03/done/S0057-row-ops-pagination\|S0057]] · inline edit + live merge → [[../../../plan/Jord/phase-03/done/S0058-inline-edit-live-sync\|S0058]] |

### Tables row ops + fetch-more (S0057)

| Piece | Fact |
|-------|------|
| Insert | Inspector `insert-table-row` — form from column model (defaults, generated-id blank, validation messages) |
| Duplicate | Seeds via ephemeral `putRowSeed` + `seedPk` prop; PK cleared for a fresh insert |
| Delete | Confirm dialog names the row; waits for write-queue ack before refresh |
| Multi-select | Apolyx DataGrid `selectionMode="multi"` + select-all on loaded page |
| Bulk delete | Chunked (`BULK_DELETE_CHUNK=25`); progress + per-row failure list; successes kept |
| Paging | Offset fetch-more append; page size 25/50/100; `?total=1` returns exact `COUNT(*)`; jump-to-end when total known |
| Empty | Primary **Insert row** when `total === 0` |
| Perf | Kit virtualization: 10k-row test mounts &lt; 200 DOM rows |
| Helpers | `lib/studio-row-ops.ts` · `lib/studio-row-seed.ts` |

### Tables inline edit + live merge (S0058)

| Piece | Fact |
|-------|------|
| Kit | DataGrid `editable` + typed editors + `onCellCommit` pending/error chrome · `applyDataGridExternalPatch` skips the editing cell |
| Editors | text · number · boolean switch · date · json textarea · fk text (select when `editorOptions` set) |
| Commit | Optimistic overlay → `PATCH /schema/tables/:name/rows/:pk` with `{ values, old }` compare-and-swap → ack clears pending; rejection restores + toast |
| OCC | Engine `UpdateTableRowInput.old` → null-safe WHERE (`IS` / `IS NOT DISTINCT FROM`); mismatch → `conflict` **409** |
| Live | SSE `jord.change`: delete removes by pk (warns if that row is under edit); update/insert/resync refetch while preserving the editing cell |
| Helpers | `lib/studio-inline-edit.ts` |
| Toast | Root layout mounts Apolyx `Toaster` |

### Right inspector (S0048)

One host overlays the **content pane only** (primary nav stays clear). State is URL-addressable; ESC / backdrop / browser Back close it.

| Piece | Fact |
|-------|------|
| API | `InspectorProvider` + `useInspector()` in `inspector-host.tsx` — `open(id, props)`, `close()` |
| URL | `?inspector=<id>` plus optional `recordId` / `table` / `schema`; helpers in `lib/studio-inspector.ts` |
| Panels | `create-record` · `create-table` · `record-detail` · `migrate` · `insert-table-row` (policies land in later cards) |
| Frame | `StudioInspector` — FocusScope trap + restore, dim+blur backdrop, ~420–520 px, &lt;200 ms motion, `useReducedMotion` |
| Chrome | Sticky title + close; `InspectorFooter` for primary actions |
| Deep links | `/records/new` and `/records/[id]` redirect to `?inspector=…`; migrate page auto-opens `migrate` |
| Responsive | Below `lg`: Apolyx `Sheet` full-height (same slot content) |

## Not in Jord yet

Monaco, multi-tenant hosting, Artemis screens inside Studio. Wave C (shell) + wave D (column model) closed. Wave E tables: [[../../../plan/Jord/phase-03/done/S0056-grid-column-ops|S0056]]–[[../../../plan/Jord/phase-03/done/S0058-inline-edit-live-sync|S0058]] done; next [[../../../plan/Jord/phase-03/S0059-policies-apis-drawers|S0059]] policies + APIs drawers.
