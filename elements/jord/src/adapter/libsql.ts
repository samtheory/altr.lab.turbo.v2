import { mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createClient, type Client } from "@libsql/client";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type {
  InsertRecordInput,
  JordDb,
  JordDriverPort,
  JordRecord,
  UpdateRecordInput,
  UpdateRecordResult,
} from "../port.js";
import { records, schema } from "../schema/records.js";
import { ensureRecordsSchema } from "../schema/migrate.js";
import { fileUrlToFsPath } from "../url.js";

const WAL_PRAGMAS = [
  "PRAGMA journal_mode = WAL",
  "PRAGMA busy_timeout = 5000",
  "PRAGMA synchronous = NORMAL",
] as const;

function mapRow(row: typeof records.$inferSelect): JordRecord {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    version: row.version,
  };
}

export class LibSqlAdapter implements JordDriverPort {
  readonly dialect = "libsql" as const;
  readonly client: Client;
  readonly db: JordDb;

  private constructor(client: Client) {
    this.client = client;
    this.db = drizzle(client, { schema });
  }

  static async open(fileUrl: string): Promise<LibSqlAdapter> {
    const fsPath = fileUrlToFsPath(fileUrl);
    await mkdir(path.dirname(fsPath), { recursive: true });

    const client = createClient({ url: fileUrl });
    for (const pragma of WAL_PRAGMAS) {
      await client.execute(pragma);
    }
    await ensureRecordsSchema(client);

    return new LibSqlAdapter(client);
  }

  async close(): Promise<void> {
    try {
      await this.client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
      // Best-effort — still close so Windows can unlock the file.
    }
    this.client.close();
  }

  async checkpointTruncate(): Promise<void> {
    await this.client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
  }

  async insertRecord(input: InsertRecordInput): Promise<JordRecord> {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      bucket: input.bucket,
      body: input.body,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await this.db.insert(records).values(row);
    return mapRow(row);
  }

  async getRecord(id: string): Promise<JordRecord | null> {
    const rows = await this.db
      .select()
      .from(records)
      .where(eq(records.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async listRecordsByBucket(bucket: string): Promise<JordRecord[]> {
    const rows = await this.db
      .select()
      .from(records)
      .where(eq(records.bucket, bucket))
      .orderBy(desc(records.createdAt));
    return rows.map(mapRow);
  }

  async updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult> {
    const now = Date.now();
    const setClauses: string[] = [
      "version = version + 1",
      "updated_at = ?",
    ];
    const args: Array<string | number | null> = [now];

    if (input.body !== undefined) {
      setClauses.push("body = ?");
      args.push(input.body);
    }
    if (input.metadata !== undefined) {
      setClauses.push("metadata = ?");
      args.push(input.metadata);
    }
    if (input.bucket !== undefined) {
      setClauses.push("bucket = ?");
      args.push(input.bucket);
    }

    args.push(input.id, input.version);

    const result = await this.client.execute({
      sql: `UPDATE records SET ${setClauses.join(", ")} WHERE id = ? AND version = ?`,
      args,
    });

    if (result.rowsAffected === 0) {
      return { ok: false, conflict: true };
    }

    const record = await this.getRecord(input.id);
    if (!record) {
      return { ok: false, conflict: true };
    }
    return { ok: true, record };
  }

  async snapshotTo(destPath: string): Promise<string> {
    const absDest = path.resolve(destPath);
    await mkdir(path.dirname(absDest), { recursive: true });
    // VACUUM INTO is the SQL-facing online backup path for libSQL/SQLite 3.27+.
    const destLiteral = absDest.replace(/\\/g, "/").replace(/'/g, "''");
    await this.client.execute(`VACUUM INTO '${destLiteral}'`);
    return absDest;
  }
}
