#!/usr/bin/env node
/**
 * S0040 helper — compare per-table row counts + MAX(jord_changes.seq)
 * between two file: libSQL databases when the sqlite3 CLI is unavailable.
 *
 * Usage: node restore-drill-compare.mjs <source.db> <scratch.db>
 * Exit 0 on match, 1 on mismatch.
 */
import { createClient } from "@libsql/client";
import { pathToFileURL } from "node:url";
import path from "node:path";

const CORE_TABLES = [
  "records",
  "jord_jobs",
  "jord_job_runs",
  "jord_functions",
  "jord_custom_apis",
  "jord_policies",
  "jord_triggers",
  "jord_blobs",
  "jord_embeddings",
  "jord_users",
  "jord_auth_tokens",
  "jord_refresh_tokens",
  "jord_table_rls",
  "jord_changes",
  "jord_tracked_tables",
  "jord_logs",
  "jord_sql_audit",
  "jord_migrate_jobs",
  "jord_migrations",
  "jord_rate_limits",
  "jord_idempotency",
];

function toUrl(p) {
  const abs = path.resolve(p);
  return pathToFileURL(abs).href;
}

async function scalar(client, sql) {
  try {
    const r = await client.execute(sql);
    const row = r.rows[0];
    if (!row) return "missing";
    const v = row.n ?? row[0] ?? Object.values(row)[0];
    return String(v ?? "missing");
  } catch {
    return "missing";
  }
}

async function main() {
  const [, , srcPath, dstPath] = process.argv;
  if (!srcPath || !dstPath) {
    console.error("usage: restore-drill-compare.mjs <source.db> <scratch.db>");
    process.exit(2);
  }

  const src = createClient({ url: toUrl(srcPath) });
  const dst = createClient({ url: toUrl(dstPath) });
  let mismatches = 0;

  console.log("--- row counts ---");
  console.log(
    `${"table".padEnd(28)} ${"source".padStart(12)} ${"scratch".padStart(12)} ok?`,
  );
  for (const t of CORE_TABLES) {
    const srcN = await scalar(src, `SELECT COUNT(*) AS n FROM ${t}`);
    const dstN = await scalar(dst, `SELECT COUNT(*) AS n FROM ${t}`);
    const mark = srcN === dstN ? "OK" : "FAIL";
    if (mark === "FAIL") mismatches += 1;
    console.log(
      `${t.padEnd(28)} ${srcN.padStart(12)} ${dstN.padStart(12)} ${mark}`,
    );
  }

  console.log("--- jord_changes max seq ---");
  const srcSeq = await scalar(
    src,
    "SELECT COALESCE(MAX(seq), 0) AS n FROM jord_changes",
  );
  const dstSeq = await scalar(
    dst,
    "SELECT COALESCE(MAX(seq), 0) AS n FROM jord_changes",
  );
  const seqMark = srcSeq === dstSeq ? "OK" : "FAIL";
  if (seqMark === "FAIL") mismatches += 1;
  console.log(
    `${"max(jord_changes.seq)".padEnd(28)} ${srcSeq.padStart(12)} ${dstSeq.padStart(12)} ${seqMark}`,
  );

  src.close();
  dst.close();

  if (mismatches !== 0) {
    console.error(`FAIL: ${mismatches} mismatch(es)`);
    process.exit(1);
  }
  console.log("PASS: file libSQL restore drill (counts + max seq match)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
