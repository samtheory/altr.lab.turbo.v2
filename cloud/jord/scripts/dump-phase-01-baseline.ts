/**
 * Dump a phase-01 file database after the ad-hoc CREATE TABLE IF NOT EXISTS boot.
 *
 * Run only inside a worktree of commit eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c.
 * This script refuses to write a fixture when `jord_migrations` already exists,
 * which is the S0021 runner — that dump would not be the phase-01 baseline.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createJordClient, fsPathToFileUrl, JORD_TABLE_NAMES, LibSqlAdapter } from "@altr/jord";

const SOURCE = "eb7d7fd25dfbda32a258b0ea1c1d6409fdacfe3c";
const SEED_ID = "phase-01-seed";
const SEED_BODY = '{"ok":true}';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultOut = path.resolve(scriptDir, "../fixtures/phase-01-baseline.sql");
const outPath = process.env.JORD_DUMP_OUT
  ? path.resolve(process.env.JORD_DUMP_OUT)
  : defaultOut;

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const dir = mkdtempSync(path.join(tmpdir(), "jord-p01-dump-"));
const url = fsPathToFileUrl(path.join(dir, "jord.db"));
const jord = await createJordClient({ url });
if (!(jord instanceof LibSqlAdapter)) {
  throw new Error("phase-01 dump requires a file libSQL database");
}

try {
  const probe = await jord.client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'jord_migrations'",
  );
  if (probe.rows.length > 0) {
    throw new Error(
      "dump:phase-01-baseline must run on phase-01 code (commit eb7d7fd). This tree already has the S0021 migration runner.",
    );
  }

  await jord.client.execute({
    sql: `INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
          VALUES (?, 'baseline', ?, NULL, 1, 1, 1)`,
    args: [SEED_ID, SEED_BODY],
  });

  const placeholders = JORD_TABLE_NAMES.map(() => "?").join(", ");
  const master = await jord.client.execute({
    sql: `SELECT type, name, tbl_name, sql FROM sqlite_master
          WHERE sql IS NOT NULL
            AND name NOT LIKE 'sqlite_%'
            AND (
              (type = 'table' AND name IN (${placeholders}))
              OR (type = 'index' AND tbl_name IN (${placeholders}))
            )`,
    args: [...JORD_TABLE_NAMES, ...JORD_TABLE_NAMES],
  });

  const objects = master.rows
    .map((row) => ({
      type: String(row.type),
      name: String(row.name),
      sql: String(row.sql).replace(/\r\n/g, "\n").trim(),
    }))
    .sort((a, b) => {
      const rank = (type: string) => (type === "table" ? 0 : 1);
      const byType = rank(a.type) - rank(b.type);
      if (byType !== 0) return byType;
      return a.name.localeCompare(b.name);
    });

  const tableNames = new Set(
    objects.filter((object) => object.type === "table").map((object) => object.name),
  );
  for (const name of JORD_TABLE_NAMES) {
    if (!tableNames.has(name)) {
      throw new Error(`phase-01 boot did not create ${name}`);
    }
  }

  const lines = [
    `-- source: ${SOURCE}`,
    `-- seed: ${SEED_ID}`,
    "",
    ...objects.map((object) => `${object.sql};`),
    "",
    "INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)",
    `VALUES (${sqlString(SEED_ID)}, 'baseline', ${sqlString(SEED_BODY)}, NULL, 1, 1, 1);`,
    "",
  ];

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join("\n"), "utf8");
  process.stdout.write(`${outPath}\n`);
} finally {
  await jord.close();
}
