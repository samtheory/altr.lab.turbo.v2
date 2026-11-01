/**
 * One-shot: open a Postgres URL (runs migrations) and insert a seed record + outbox row.
 * Used only for local S0040 proof — not a product command.
 */
import { createJordClient } from "@altr/jord";

const url = process.env.DATABASE_URL?.trim();
if (!url || !(url.startsWith("postgres://") || url.startsWith("postgresql://"))) {
  console.error("Set DATABASE_URL to a postgres:// URL");
  process.exit(2);
}

const jord = await createJordClient({ url });
const now = Date.now();

await jord.query(
  `INSERT INTO records (id, bucket, body, version, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6)
   ON CONFLICT (id) DO NOTHING`,
  ["s0040-seed", "lab", JSON.stringify({ ok: true, drill: "S0040" }), 1, now, now],
);

await jord.query(
  `INSERT INTO jord_tracked_tables (table_name, tracked_at) VALUES ($1, $2)
   ON CONFLICT (table_name) DO NOTHING`,
  ["records", now],
);

await jord.query(
  `INSERT INTO jord_changes (table_name, op, pk, old_json, new_json, actor, ts)
   VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  [
    "records",
    "insert",
    "s0040-seed",
    null,
    JSON.stringify({ id: "s0040-seed" }),
    "s0040-drill",
    now,
  ],
);

const counts = await jord.query(`SELECT COUNT(*)::text AS n FROM records`);
const seq = await jord.query(
  `SELECT COALESCE(MAX(seq), 0)::text AS n FROM jord_changes`,
);
console.log(
  JSON.stringify({
    records: counts[0]?.n,
    maxSeq: seq[0]?.n,
  }),
);

await jord.close();
