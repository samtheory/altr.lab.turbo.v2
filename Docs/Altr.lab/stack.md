# Stack decisions

## Defaults

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + **pnpm** workspaces |
| Language | TypeScript everywhere |
| Frontend | React / Next.js (App Router) |
| UI | Tailwind **v4** + shadcn-style components in `@altr/ui-kit` |
| Theme | CSS variables + `next-themes` (`ThemeProvider` / `ThemeToggle`) |
| API | Hono + Bun (`cloud/hono-server`) |
| Primary DB | **Turso (libSQL)** — stub in `@altr/base/db` |

## Databases

### Turso (primary)

Use Turso / libSQL for app persistence. Env placeholders:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

See `elements/base/src/db/`.

### PocketBase (optional)

Optional service under `cloud/pocketbase`. Good for quick admin UI, files, or experiments — **not** the default production store.

### Postgres / MongoDB (layer later)

Documented as future layers only. Do not make them the default in new features unless a plan in `Docs/plan/` explicitly adopts them. Prefer Turso first; add Postgres/Mongo when you need relational reporting, existing vendor lock-in, or document workloads that Turso does not fit.

## AI

- Shared stubs: `@altr/base/ai`
- Service placeholder: `cloud/ai-bot-agent`
- Agent definitions: `Docs/agents/`
