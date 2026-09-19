# Database (Turso / libSQL)

Primary database for altr.lab is **Turso (libSQL)**.

## Planned env

```env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...
```

## Status

`createTursoClient` is a stub. Next step: add `@libsql/client` and implement real execute/batch helpers.

See `Docs/Altr.lab/stack.md` for when to use PocketBase, Postgres, or MongoDB.
