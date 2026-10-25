# Jord Studio (`@altr/jord-studio`)

Local control plane for Jord: browse/edit `records` rows and inspect/extend schema through `@altr/jord-server`. The browser never opens `data/jord.db`.

## Dev (two processes)

```bash
# terminal 1 — API (write queue + WAL). Requires JORD_SERVER_TOKEN.
set JORD_SERVER_TOKEN=dev-jord-token-change-me
pnpm dev:jord

# terminal 2 — UI (BFF + Apolyx)
pnpm dev:jord-studio
```

Studio: [http://127.0.0.1:3005](http://127.0.0.1:3005)  
API: [http://127.0.0.1:8787](http://127.0.0.1:8787)

Copy `.env.example` → `.env.local`. Defaults:

| Var | Default | Role |
|-----|---------|------|
| `JORD_SERVER_URL` | `http://127.0.0.1:8787` | BFF upstream |
| `JORD_SERVER_TOKEN` | (required) | Shared secret with jord-server |
| `JORD_STUDIO_PASSWORD` | (required for login) | Operator password |
| `JORD_STUDIO_ROLE` | `admin` | Role minted into the session |
| `JORD_DEFAULT_ROLE` | `admin` | Operator role if the server escape `JORD_LEGACY_SECRET_ROLE=admin` is set. Studio sends HMAC, not the raw secret |
| `JORD_STUDIO_OPEN` | `1` in example | Lab bypass (skip login UI) |

## Auth (S3)

- Sign in at `/login` → HTTP-only `jord_session` cookie (signed bearer).
- BFF attaches `Authorization: Bearer …` on every upstream call.
- Roles: `admin` (records + schema), `editor` (records only), `readonly` (read only).

## Surfaces

| Path | Role |
|------|------|
| `/login` | Operator sign-in |
| `/records` | Table editor for `records` |
| `/records/new` | Insert row (hidden for readonly) |
| `/schema` | Schema browser + visualizer + ADD COLUMN (admin) |
| `/help` | Session · role |

## Stack

- Next.js App Router + Tailwind v4
- UI: workspace `@altr/apolyx` only (Apolyx-first)
- Data: Route Handlers under `/api/*` → jord-server
