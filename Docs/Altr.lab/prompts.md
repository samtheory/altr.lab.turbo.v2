# Prompts & alternate workflows

Reusable prompts / commands for running altr.lab differently or with AI help.

## Local product surfaces

- Marketing only: `pnpm dev:web`
- Admin only: `pnpm dev:dashboard`
- Trading only: `pnpm dev:trading-ui`
- API only: `pnpm dev:api` (Bun required)

## UI kit work

When adding shadcn components, target **elements/ui-kit** (`components.json` lives there). Apps should import from `@altr/ui-kit`, not copy components.

## AI agent prompts (starter)

Paste into Cursor / agents when scaffolding features:

1. **Feature from idea** — “Read `Docs/idea/` and `Docs/feature_list/`, draft a plan under `Docs/plan/`, then implement only what the plan lists. Update `Docs/tech_space/` and `Docs/report/STATUS.md`.”
2. **UI consistency** — “Use `@altr/ui-kit` tokens and components; do not add a second theme system in the app.”
3. **Data access** — “Prefer `@altr/base/db` (Turso). Do not introduce Postgres/Mongo unless the plan says so. PocketBase only if the task is explicitly optional-PB.”

Add more prompt files under `Docs/agents/prompts/` as patterns stabilize.
