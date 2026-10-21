# `@altr/jord-server`

Hono API over `@altr/jord` (write queue, WAL checkpoints, OCC). Studio and agents talk HTTP only — never open `data/jord.db` from the browser.

## Dev

```bash
# from repo root — copy cloud/jord/.env.example → cloud/jord/.env first
pnpm dev:jord
```

Default: [http://127.0.0.1:8787](http://127.0.0.1:8787). `startJordServer` loads `.env` if present (does not override shell env).

## Env

| Var | Required | Role |
|-----|----------|------|
| `JORD_SERVER_TOKEN` | **yes** | Shared bearer / HMAC secret (S3) |
| `JORD_DEFAULT_ROLE` | no (default `admin`) | Role when the raw secret is sent as `Authorization: Bearer …` |
| `DATABASE_URL` | no | `file:` URL for libSQL (Slice 0) |
| `PORT` | no (default `8787`) | Listen port |
| `JORD_WAL_CHECKPOINT_MS` | no | WAL truncate interval |

## Auth (Studio S3)

| Route | Auth |
|-------|------|
| `GET /health` | Public |
| `/records/*`, `/schema/*` | `Authorization: Bearer <token>` |

Bearer may be:

1. The raw `JORD_SERVER_TOKEN` → role = `JORD_DEFAULT_ROLE`
2. A signed session token from Studio login (`payload.sig` HMAC-SHA256)

| Role | Read | Write records | ADD COLUMN |
|------|------|---------------|------------|
| `readonly` | yes | 403 | 403 |
| `editor` | yes | yes | 403 |
| `admin` | yes | yes | yes |

Missing/invalid credentials → **401**. Insufficient role → **403**. Stale OCC → **409**.
