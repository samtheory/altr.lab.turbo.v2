# Monorepo structure

```
altr.lab.turbo.v2/
├── apps/
│   ├── web/              # @altr/web — marketing / public site (Next.js, :3000)
│   ├── dashboard/        # @altr/dashboard — admin UI (Next.js, :3001)
│   └── trading-ui/       # @altr/trading-ui — trading UI (Next.js, :3002)
├── cloud/
│   ├── hono-server/      # @altr/hono-server — Hono + Bun API (:8787)
│   ├── pocketbase/       # @altr/pocketbase — optional PB placeholder
│   └── ai-bot-agent/     # @altr/ai-bot-agent — AI agent placeholder
├── elements/
│   ├── ui-kit/           # @altr/ui-kit — Tailwind v4 + shadcn + theme
│   └── base/             # @altr/base — db, env, errors, auth, query, ai stubs
├── Docs/                 # Obsidian second brain (this tree)
├── package.json          # pnpm workspaces root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Workspaces

Root `package.json` / `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "cloud/*"
  - "elements/*"
```

## Package scope

All packages use the `@altr/*` scope (e.g. `@altr/web`, `@altr/ui-kit`, `@altr/base`).

## Shared TypeScript

`tsconfig.base.json` at the repo root. Packages extend it via `"extends": "../../tsconfig.base.json"`.

## UI sharing

Apps depend on `@altr/ui-kit`, import `@altr/ui-kit/globals.css`, wrap with `ThemeProvider`, and set `transpilePackages: ["@altr/ui-kit"]` in Next config.
