import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

import {
  Pool,
  type PoolClient,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";

import { JordUnsupportedError } from "../errors.js";
import type {
  AddColumnInput,
  AddColumnResult,
  AlterColumnInput,
  CreateTableInput,
  CreateTableResult,
  DeleteFunctionResult,
  DropColumnInput,
  DropTableInput,
  RenameTableInput,
  SchemaDdlResult,
  FinishJobRunInput,
  InsertCustomApiInput,
  InsertFunctionInput,
  InsertJobInput,
  InsertJobRunInput,
  InsertPolicyInput,
  DeleteTableRowInput,
  InsertRecordInput,
  InsertTableRowInput,
  MutateTableRowResult,
  UpdateTableRowInput,
  InsertTriggerInput,
  JordBlob,
  JordColumnInfo,
  JordCustomApi,
  JordDriverPort,
  JordEmbeddingMeta,
  JordFunction,
  JordHttpMethod,
  JordJob,
  JordJobRun,
  JordJobStatus,
  JordPolicy,
  JordPolicyEffect,
  JordPolicyOperation,
  JordRecord,
  JordTableInfo,
  JordSchemaInfo,
  ResolveSchemaResult,
  TableRlsFlag,
  JordTrigger,
  JordTriggerEvent,
  JordTriggerTiming,
  ListTableRowsInput,
  ListTableRowsResult,
  SearchVectorsInput,
  SearchVectorsResult,
  VectorBackend,
  VectorSearchHit,
  UpsertBlobMetaInput,
  UpsertEmbeddingInput,
  UpsertEmbeddingResult,
  UpdateCustomApiInput,
  UpdateFunctionInput,
  UpdateJobInput,
  UpdatePolicyInput,
  UpdateRecordInput,
  UpdateRecordResult,
  UpdateTriggerInput,
} from "../port.js";
import {
  compilePolicySql as compilePolicySqlText,
  planSyncRecordsRls,
  planSyncTableRls,
  quoteSqlLiteral,
  type RlsSessionContext,
} from "../schema/ddl-rls.js";
import { JORD_APP_ROLE } from "../schema/jord-app.js";
import { rowScopeSql } from "../schema/row-scope.js";
import {
  buildCreateTableSql,
  clampRowWindow,
  isJordColumnType,
  isReservedCreateTableName,
  isValidSqlIdent,
  pgColumnType,
  planCreateTable,
  quoteIdent,
  quoteQualified,
  toTableCell,
} from "../schema/ddl.js";
import { PG_DEFAULT_SCHEMA } from "../schema/schema-scope.js";
import {
  buildRebuildCopySql,
  buildRebuildCreateSql,
  planAlterColumn,
  planDropColumn,
  planDropTable,
  planRenameTable,
  SCHEMA_SCOPED_METADATA,
  TABLE_NAME_METADATA,
  rebuildTempName,
  requireUserTableName,
} from "../schema/ddl-alter.js";
import {
  planDeleteRow,
  planInsertRow,
  planUpdateRow,
} from "../schema/row-write.js";
import { normalizeColumns } from "../schema/types/introspect.js";
import { samePostgresConnection } from "../schema/connection-identity.js";
import { ensurePostgresSchema } from "../schema/migrate-postgres.js";
import { migrationLockKey } from "../schema/migrations/runner.js";
import {
  clampSqlRowCap,
  clampSqlTimeout,
  isSqlTransactionControl,
  sqlMultiStatementError,
  sqlTimeoutError,
  sqlTxControlError,
} from "../schema/sql-console.js";
import {
  clampSearchLimit,
  packF32,
  unpackF32,
  validateEmbeddingArray,
} from "../vectors/f32.js";
import {
  padEmbedding,
  PGVECTOR_HNSW_SQL,
  pgvectorColumnSql,
  toVectorLiteral,
} from "../vectors/hard.js";
import { isValidVectorNamespace } from "../vectors/names.js";
import { rankByCosine } from "../vectors/search.js";

function num(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.length > 0) return Number(value);
  return 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return num(value);
}

function bool(value: unknown): boolean {
  return value === true || value === 1 || value === "t" || value === "true";
}

function asHttpMethod(value: string): JordHttpMethod {
  if (
    value === "GET" ||
    value === "POST" ||
    value === "PATCH" ||
    value === "DELETE"
  ) {
    return value;
  }
  return "GET";
}

function asPolicyOp(value: string): JordPolicyOperation {
  if (
    value === "select" ||
    value === "insert" ||
    value === "update" ||
    value === "delete"
  ) {
    return value;
  }
  return "select";
}

function asPolicyEffect(value: string): JordPolicyEffect {
  return value === "allow" ? "allow" : "deny";
}

function asTriggerEvent(value: string): JordTriggerEvent {
  if (value === "insert" || value === "update" || value === "delete") {
    return value;
  }
  return "insert";
}

function mapRecord(row: QueryResultRow): JordRecord {
  return {
    id: String(row.id),
    bucket: String(row.bucket),
    body: String(row.body),
    metadata: row.metadata == null ? null : String(row.metadata),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
    version: num(row.version),
  };
}

function mapBlob(row: QueryResultRow): JordBlob {
  const rawStatus = row.status == null ? "ready" : String(row.status);
  const status =
    rawStatus === "pending" || rawStatus === "ready" ? rawStatus : "ready";
  return {
    id: String(row.id),
    bucket: String(row.bucket),
    key: String(row.key),
    contentType: String(row.content_type),
    size: num(row.size),
    etag: String(row.etag),
    status,
    pendingExpiresAt:
      row.pending_expires_at == null ? null : num(row.pending_expires_at),
    uploadId: row.upload_id == null ? null : String(row.upload_id),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapEmbeddingMeta(row: QueryResultRow): JordEmbeddingMeta {
  return {
    id: String(row.id),
    namespace: String(row.namespace),
    refId: row.ref_id == null ? null : String(row.ref_id),
    dims: num(row.dims),
    metadata: row.metadata == null ? null : String(row.metadata),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function asBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from([]);
}

function mapJob(row: QueryResultRow): JordJob {
  const lastStatus = row.last_status;
  const status: JordJobStatus | null =
    lastStatus === "ok" || lastStatus === "error" ? lastStatus : null;
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind),
    enabled: bool(row.enabled),
    intervalMs: num(row.interval_ms),
    config: String(row.config ?? "{}"),
    nextRunAt: numOrNull(row.next_run_at),
    lastRunAt: numOrNull(row.last_run_at),
    lastStatus: status,
    lastError: row.last_error == null ? null : String(row.last_error),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapJobRun(row: QueryResultRow): JordJobRun {
  const status =
    row.status === "running" || row.status === "ok" || row.status === "error"
      ? row.status
      : "error";
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    status,
    startedAt: num(row.started_at),
    finishedAt: numOrNull(row.finished_at),
    error: row.error == null ? null : String(row.error),
    result: row.result == null ? null : String(row.result),
  };
}

function mapFunction(row: QueryResultRow): JordFunction {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description == null ? null : String(row.description),
    steps: String(row.steps ?? "[]"),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapCustomApi(row: QueryResultRow): JordCustomApi {
  return {
    id: String(row.id),
    name: String(row.name),
    method: asHttpMethod(String(row.method)),
    slug: String(row.slug),
    functionId: String(row.function_id),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function mapPolicy(row: QueryResultRow): JordPolicy {
  return {
    id: String(row.id),
    name: String(row.name),
    tableName: String(row.table_name),
    operation: asPolicyOp(String(row.operation)),
    effect: asPolicyEffect(String(row.effect)),
    rules: String(row.rules ?? "[]"),
    priority: num(row.priority),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

function rlsEnabledFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "bigint") return value === 1n;
  if (typeof value === "number") return value === 1;
  return value === "1" || value === "t" || value === "true";
}

function mapTableRls(row: Record<string, unknown>): TableRlsFlag {
  const owner = row.owner_column;
  return {
    tableName: String(row.table_name ?? ""),
    schema: row.schema_name == null ? PG_DEFAULT_SCHEMA : String(row.schema_name),
    rlsEnabled: rlsEnabledFlag(row.rls_enabled),
    ownerColumn: owner == null ? null : String(owner),
  };
}

function unknownSchemaFailure(schemaName: string): {
  ok: false;
  error: "unknown_schema";
  message: string;
} {
  return {
    ok: false,
    error: "unknown_schema",
    message: `unknown schema ${JSON.stringify(schemaName)}`,
  };
}

function mapTrigger(row: QueryResultRow): JordTrigger {
  return {
    id: String(row.id),
    name: String(row.name),
    tableName: String(row.table_name),
    timing: (row.timing === "after" ? "after" : "after") as JordTriggerTiming,
    event: asTriggerEvent(String(row.event)),
    actions: String(row.actions ?? "[]"),
    enabled: bool(row.enabled),
    createdAt: num(row.created_at),
    updatedAt: num(row.updated_at),
  };
}

const rlsSession = new AsyncLocalStorage<RlsSessionContext>();
const pgTx = new AsyncLocalStorage<PoolClient>();

/** One simple-protocol round trip: BEGIN plus the session GUCs. */
/**
 * B11: map the server's console errors to clear, internals-free messages.
 * 42601 "cannot insert multiple commands into a prepared statement" is the
 * extended-protocol multi-statement rejection; 57014 with "statement timeout"
 * is `statement_timeout` cancelling the statement (nothing committed).
 */
function mapPgConsoleError(err: unknown, timeoutMs: number): unknown {
  const pgErr = err as { code?: unknown; message?: unknown } | null;
  const code = typeof pgErr?.code === "string" ? pgErr.code : "";
  const message = typeof pgErr?.message === "string" ? pgErr.message : "";
  if (code === "42601" && /multiple commands/i.test(message)) {
    return sqlMultiStatementError();
  }
  if (code === "57014" && /statement timeout/i.test(message)) {
    return sqlTimeoutError(timeoutMs, false);
  }
  return err;
}

function beginWithSessionSql(ctx: RlsSessionContext | undefined, begin = "BEGIN"): string {
  if (!ctx) return begin;
  return `${begin}; SELECT set_config('jord.role', ${quoteSqlLiteral(ctx.role)}, true), set_config('jord.bucket', ${quoteSqlLiteral(ctx.bucket)}, true), set_config('jord.uid', ${quoteSqlLiteral(ctx.uid ?? "")}, true), set_config('jord.claims', ${quoteSqlLiteral(ctx.claims ?? "")}, true)`;
}

async function probePgvector(
  pool: Pool,
  options: { ddl: boolean },
): Promise<VectorBackend> {
  if (!options.ddl) {
    const found = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'jord_embeddings' AND column_name = 'embedding_vec'`,
    );
    return found.rows.length > 0 ? "pgvector" : "cosine";
  }
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await pool.query(pgvectorColumnSql());
    try {
      await pool.query(PGVECTOR_HNSW_SQL);
    } catch {
      // Exact `<=>` still ranks when HNSW is unavailable.
    }
    return "pgvector";
  } catch {
    return "cosine";
  }
}

export class PostgresAdapter implements JordDriverPort {
  readonly dialect = "postgres" as const;
  readonly defaultSchema = PG_DEFAULT_SCHEMA;
  readonly urlScheme = "postgres" as const;
  readonly vectorBackend: VectorBackend;
  private readonly pool: Pool;

  private constructor(pool: Pool, vectorBackend: VectorBackend) {
    this.pool = pool;
    this.vectorBackend = vectorBackend;
  }

  static async open(
    connectionString: string,
    options?: { ddl?: boolean },
  ): Promise<PostgresAdapter> {
    const pool = new Pool({ connectionString });
    // Without a listener, a server-side disconnect of an idle client crashes the process.
    // DROP DATABASE … WITH (FORCE) (test harness) terminates idle backends after pool.end();
    // that is expected teardown, not an operational fault — suppress the noise.
    pool.on("error", (err) => {
      const msg = err.message ?? "";
      if (/terminating connection|database .* does not exist/i.test(msg)) return;
      console.error("[@altr/jord] idle postgres client error:", msg);
    });
    const ddl = options?.ddl !== false;
    try {
      await pool.query("SELECT 1");
      const migrateUrl = process.env.JORD_MIGRATE_URL;
      if (
        !ddl &&
        migrateUrl &&
        samePostgresConnection(migrateUrl, connectionString)
      ) {
        throw new Error(
          "[@altr/jord] JORD_MIGRATE_URL and the runtime URL are the same connection",
        );
      }
      if (ddl) {
        await ensurePostgresSchema(pool, migrationLockKey(connectionString));
      } else {
        const { assertRuntimeRole } = await import("../schema/jord-app.js");
        await assertRuntimeRole(pool);
      }
      const vectorBackend = await probePgvector(pool, { ddl });
      const adapter = new PostgresAdapter(pool, vectorBackend);
      if (ddl) await adapter.syncRecordsPoliciesRls();
      return adapter;
    } catch (err) {
      await pool.end().catch(() => undefined);
      throw err;
    }
  }

  async query(
    sql: string,
    args: Array<string | number | null> = [],
  ): Promise<Array<Record<string, unknown>>> {
    const result = await this.exec(sql, args);
    return result.rows as Array<Record<string, unknown>>;
  }

  /**
   * Every runtime statement goes through here: join the open transaction,
   * else wrap in one that sets the request GUCs (FORCE RLS needs them),
   * else run on the pool.
   */
  private async exec(text: string, params: unknown[] = []): Promise<QueryResult> {
    const tx = pgTx.getStore();
    if (tx) return tx.query(text, params);
    const ctx = rlsSession.getStore();
    if (!ctx) return this.pool.query(text, params);
    const client = await this.pool.connect();
    try {
      await client.query(beginWithSessionSql(ctx));
      const result = await client.query(text, params);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (pgTx.getStore()) return work();
    const client = await this.pool.connect();
    try {
      await client.query(beginWithSessionSql(rlsSession.getStore()));
      const result = await pgTx.run(client, work);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async executeSql(input: {
    sql: string;
    args?: Array<string | number | null>;
    readOnly: boolean;
    timeoutMs?: number;
    rowCap?: number;
  }): Promise<{
    columns: string[];
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    truncated: boolean;
    elapsedMs: number;
  }> {
    const rowCap = clampSqlRowCap(input.rowCap);
    const timeoutMs = clampSqlTimeout(input.timeoutMs);
    const args = input.args ?? [];
    // B11: COMMIT / ROLLBACK / BEGIN would end or nest our BEGIN [READ ONLY].
    if (isSqlTransactionControl(input.sql)) throw sqlTxControlError();
    const started = Date.now();
    const client = await this.pool.connect();
    try {
      await client.query(
        beginWithSessionSql(rlsSession.getStore(), input.readOnly ? "BEGIN READ ONLY" : "BEGIN"),
      );
      await client.query(`SET LOCAL statement_timeout = ${timeoutMs}`);
      // B11: force the extended protocol. With no values pg would use the
      // simple protocol, which runs every `;`-separated statement, so
      // `COMMIT; INSERT …` escaped BEGIN READ ONLY. In extended mode the
      // server parses one statement and rejects `a; b` before running any.
      const config: QueryConfig & { queryMode: "extended" } = {
        text: input.sql,
        values: args,
        queryMode: "extended",
      };
      let result: QueryResult | QueryResult[];
      try {
        result = (await client.query(config)) as QueryResult | QueryResult[];
      } catch (err) {
        throw mapPgConsoleError(err, timeoutMs);
      }
      // Belt and braces: several results mean several statements ran.
      // Throwing here rolls back before anything is committed.
      if (Array.isArray(result)) throw sqlMultiStatementError();
      await client.query("COMMIT");
      const columns = (result.fields ?? []).map((field) => field.name);
      const mapped = (result.rows ?? []) as Array<Record<string, unknown>>;
      const truncated = mapped.length > rowCap;
      return {
        columns,
        rows: truncated ? mapped.slice(0, rowCap) : mapped,
        rowCount: mapped.length,
        truncated,
        elapsedMs: Date.now() - started,
      };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      // B11: never hand a console connection back to the pool. A
      // `SET SESSION …` / `SET ROLE …` run here must not leak into later
      // requests that share pooled connections.
      client.release(true);
    }
  }

  bindRlsSession(input: {
    role: string;
    bucket?: string | null;
    uid?: string | null;
    claims?: Record<string, unknown> | null;
  }): void {
    const claims: Record<string, string> = {};
    for (const [key, value] of Object.entries(input.claims ?? {})) {
      if (typeof value === "string" || typeof value === "number") {
        claims[key] = String(value);
      }
    }
    rlsSession.enterWith({
      role: input.role,
      bucket: input.bucket ?? "",
      uid: input.uid ?? "",
      claims: Object.keys(claims).length > 0 ? JSON.stringify(claims) : "",
    });
  }

  async getTableRls(
    tableName: string,
    schemaName: string = PG_DEFAULT_SCHEMA,
  ): Promise<TableRlsFlag | null> {
    const rows = await this.query(
      `SELECT schema_name, table_name, rls_enabled, owner_column FROM jord_table_rls
       WHERE schema_name = $1 AND table_name = $2 LIMIT 1`,
      [schemaName, tableName],
    );
    const row = rows[0];
    return row ? mapTableRls(row) : null;
  }

  async setTableRls(input: {
    tableName: string;
    schema?: string;
    rlsEnabled: boolean;
    ownerColumn?: string | null;
  }): Promise<TableRlsFlag> {
    const schemaName = input.schema ?? PG_DEFAULT_SCHEMA;
    const updatedAt = Date.now();
    const ownerColumn = input.ownerColumn ?? null;
    const enabled = input.rlsEnabled ? "TRUE" : "FALSE";
    const rows = await this.query(
      `INSERT INTO jord_table_rls (schema_name, table_name, rls_enabled, owner_column, updated_at)
       VALUES ($1, $2, ${enabled}, $3, $4)
       ON CONFLICT (schema_name, table_name) DO UPDATE SET
         rls_enabled = EXCLUDED.rls_enabled,
         owner_column = EXCLUDED.owner_column,
         updated_at = EXCLUDED.updated_at
       RETURNING schema_name, table_name, rls_enabled, owner_column`,
      [schemaName, input.tableName, ownerColumn, updatedAt],
    );
    const row = rows[0];
    return row
      ? mapTableRls(row)
      : {
          tableName: input.tableName,
          schema: schemaName,
          rlsEnabled: input.rlsEnabled,
          ownerColumn,
        };
  }

  compilePolicySql(policy: JordPolicy, schemaName?: string): string | null {
    return compilePolicySqlText(policy, undefined, schemaName);
  }

  async syncRecordsPoliciesRls(): Promise<void> {
    const policies = await this.listPolicies();
    const statements = [...planSyncRecordsRls(policies).statements];
    const flags = await this.pool.query(
      `SELECT r.schema_name, r.table_name, r.rls_enabled,
              EXISTS (
                SELECT 1 FROM information_schema.columns c
                WHERE c.table_schema = r.schema_name AND c.table_name = r.table_name AND c.column_name = 'bucket'
              ) AS has_bucket
       FROM jord_table_rls r
       JOIN information_schema.tables t
         ON t.table_schema = r.schema_name AND t.table_name = r.table_name
       WHERE r.table_name <> 'records'`,
    );
    // Every schema holding a flagged table gets DML grants (public always).
    const grantSchemas = new Set<string>([PG_DEFAULT_SCHEMA]);
    for (const row of flags.rows) {
      const tableName = String(row.table_name);
      const schemaName = String(row.schema_name ?? PG_DEFAULT_SCHEMA);
      if (!isValidSqlIdent(tableName) || !isValidSqlIdent(schemaName)) continue;
      grantSchemas.add(schemaName);
      statements.push(
        ...planSyncTableRls(tableName, policies, {
          enable: rlsEnabledFlag(row.rls_enabled),
          shape: { hasBucket: bool(row.has_bucket) },
          schema: schemaName,
        }).statements,
      );
    }
    const app = await this.pool.query(
      "SELECT 1 FROM pg_roles WHERE rolname = $1",
      [JORD_APP_ROLE],
    );
    if (app.rows.length > 0) {
      // An operator who granted `jord_app` USAGE on a schema opted it in: tables
      // created there later must be reachable without a per-table RLS flag.
      const usable = await this.pool.query(
        `SELECT nspname AS name FROM pg_catalog.pg_namespace
         WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
           AND has_schema_privilege($1, nspname, 'USAGE')`,
        [JORD_APP_ROLE],
      );
      for (const row of usable.rows) {
        const name = String(row.name);
        if (isValidSqlIdent(name)) grantSchemas.add(name);
      }
      for (const schemaName of grantSchemas) {
        const ident = quoteIdent(schemaName);
        // `public` already grants USAGE to everyone; skip it so a non-owner
        // migrate role does not fail on GRANT.
        if (schemaName !== PG_DEFAULT_SCHEMA) {
          statements.push(`GRANT USAGE ON SCHEMA ${ident} TO ${JORD_APP_ROLE}`);
        }
        statements.push(
          `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${ident} TO ${JORD_APP_ROLE}`,
          `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${ident} TO ${JORD_APP_ROLE}`,
        );
      }
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      for (const sql of statements) {
        await client.query(sql);
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Records SQL. When a request bound a session, set GUCs in the same
   * transaction so FORCE RLS sees `jord.role` / `jord.bucket` / `jord.uid`.
   * `bypass` turns row_security off (table owner only) so get-by-id can
   * still return the row for the middleware 403 path.
   */
  private async queryRecords(
    text: string,
    params: unknown[] = [],
    mode: "enforce" | "bypass" = "enforce",
  ): Promise<QueryResult> {
    if (mode === "enforce") return this.exec(text, params);
    const client = await this.pool.connect();
    try {
      await client.query(beginWithSessionSql(rlsSession.getStore()));
      await client.query("SET LOCAL row_security = off");
      const result = await client.query(text, params);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async checkpointTruncate(): Promise<void> {
    // Postgres has no SQLite WAL file — intentional no-op.
  }

  async insertRecord(input: InsertRecordInput): Promise<JordRecord> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.queryRecords(
      `INSERT INTO records (id, bucket, body, metadata, created_at, updated_at, version)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       RETURNING *`,
      [id, input.bucket, input.body, input.metadata ?? null, now, now],
    );
    return mapRecord(result.rows[0]!);
  }

  async getRecord(id: string): Promise<JordRecord | null> {
    const result = await this.queryRecords(
      `SELECT * FROM records WHERE id = $1 LIMIT 1`,
      [id],
      "bypass",
    );
    const row = result.rows[0];
    return row ? mapRecord(row) : null;
  }

  async listRecordsByBucket(bucket: string): Promise<JordRecord[]> {
    const result = await this.queryRecords(
      `SELECT * FROM records WHERE bucket = $1 ORDER BY created_at DESC`,
      [bucket],
    );
    return result.rows.map(mapRecord);
  }

  async updateRecord(input: UpdateRecordInput): Promise<UpdateRecordResult> {
    const now = Date.now();
    const sets: string[] = ["version = version + 1", "updated_at = $1"];
    const args: unknown[] = [now];
    let i = 2;
    if (input.body !== undefined) {
      sets.push(`body = $${i++}`);
      args.push(input.body);
    }
    if (input.metadata !== undefined) {
      sets.push(`metadata = $${i++}`);
      args.push(input.metadata);
    }
    if (input.bucket !== undefined) {
      sets.push(`bucket = $${i++}`);
      args.push(input.bucket);
    }
    args.push(input.id, input.version);
    const result = await this.queryRecords(
      `UPDATE records SET ${sets.join(", ")}
       WHERE id = $${i++} AND version = $${i}
       RETURNING *`,
      args,
    );
    if (result.rowCount === 0) return { ok: false, conflict: true };
    return { ok: true, record: mapRecord(result.rows[0]!) };
  }

  async deleteRecord(id: string): Promise<boolean> {
    const result = await this.queryRecords(`DELETE FROM records WHERE id = $1`, [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async listJobs(): Promise<JordJob[]> {
    const result = await this.exec(
      `SELECT * FROM jord_jobs ORDER BY created_at DESC`,
    );
    return result.rows.map(mapJob);
  }

  async getJob(id: string): Promise<JordJob | null> {
    const result = await this.exec(
      `SELECT * FROM jord_jobs WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapJob(row) : null;
  }

  async insertJob(input: InsertJobInput): Promise<JordJob> {
    const now = Date.now();
    const id = randomUUID();
    const enabled = input.enabled ?? false;
    const result = await this.exec(
      `INSERT INTO jord_jobs (
         id, name, kind, enabled, interval_ms, config, next_run_at,
         last_run_at, last_status, last_error, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,$8,$9)
       RETURNING *`,
      [
        id,
        input.name,
        input.kind,
        enabled,
        input.intervalMs,
        input.config ?? "{}",
        input.nextRunAt ?? (enabled ? now : null),
        now,
        now,
      ],
    );
    return mapJob(result.rows[0]!);
  }

  async updateJob(input: UpdateJobInput): Promise<JordJob | null> {
    const existing = await this.getJob(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.exec(
      `UPDATE jord_jobs SET
         name = $1, kind = $2, enabled = $3, interval_ms = $4, config = $5,
         next_run_at = $6, last_run_at = $7, last_status = $8, last_error = $9,
         updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.kind ?? existing.kind,
        input.enabled ?? existing.enabled,
        input.intervalMs ?? existing.intervalMs,
        input.config ?? existing.config,
        input.nextRunAt !== undefined ? input.nextRunAt : existing.nextRunAt,
        input.lastRunAt !== undefined ? input.lastRunAt : existing.lastRunAt,
        input.lastStatus !== undefined ? input.lastStatus : existing.lastStatus,
        input.lastError !== undefined ? input.lastError : existing.lastError,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapJob(row) : null;
  }

  async deleteJob(id: string): Promise<boolean> {
    await this.exec(`DELETE FROM jord_job_runs WHERE job_id = $1`, [id]);
    const result = await this.exec(
      `DELETE FROM jord_jobs WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listJobRuns(jobId: string, limit = 50): Promise<JordJobRun[]> {
    const capped = Math.max(1, Math.min(limit, 200));
    const result = await this.exec(
      `SELECT * FROM jord_job_runs WHERE job_id = $1
       ORDER BY started_at DESC LIMIT $2`,
      [jobId, capped],
    );
    return result.rows.map(mapJobRun);
  }

  async insertJobRun(input: InsertJobRunInput): Promise<JordJobRun> {
    const startedAt = input.startedAt ?? Date.now();
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_job_runs (id, job_id, status, started_at, finished_at, error, result)
       VALUES ($1, $2, 'running', $3, NULL, NULL, NULL)
       RETURNING *`,
      [id, input.jobId, startedAt],
    );
    return mapJobRun(result.rows[0]!);
  }

  async finishJobRun(input: FinishJobRunInput): Promise<JordJobRun | null> {
    const finishedAt = input.finishedAt ?? Date.now();
    const result = await this.exec(
      `UPDATE jord_job_runs SET
         status = $1, finished_at = $2, error = $3, result = $4
       WHERE id = $5
       RETURNING *`,
      [
        input.status,
        finishedAt,
        input.error ?? null,
        input.result ?? null,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapJobRun(row) : null;
  }

  async listDueJobs(nowMs: number): Promise<JordJob[]> {
    const result = await this.exec(
      `SELECT * FROM jord_jobs
       WHERE enabled = TRUE
         AND (next_run_at IS NULL OR next_run_at <= $1)
       ORDER BY next_run_at NULLS FIRST`,
      [nowMs],
    );
    return result.rows.map(mapJob);
  }

  async listFunctions(): Promise<JordFunction[]> {
    const result = await this.exec(
      `SELECT * FROM jord_functions ORDER BY created_at DESC`,
    );
    return result.rows.map(mapFunction);
  }

  async getFunction(id: string): Promise<JordFunction | null> {
    const result = await this.exec(
      `SELECT * FROM jord_functions WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async getFunctionBySlug(slug: string): Promise<JordFunction | null> {
    const result = await this.exec(
      `SELECT * FROM jord_functions WHERE slug = $1 LIMIT 1`,
      [slug],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async insertFunction(input: InsertFunctionInput): Promise<JordFunction> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_functions
         (id, name, slug, description, steps, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        input.name,
        input.slug,
        input.description ?? null,
        input.steps ?? "[]",
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapFunction(result.rows[0]!);
  }

  async updateFunction(
    input: UpdateFunctionInput,
  ): Promise<JordFunction | null> {
    const existing = await this.getFunction(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.exec(
      `UPDATE jord_functions SET
         name = $1, slug = $2, description = $3, steps = $4,
         enabled = $5, updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.slug ?? existing.slug,
        input.description !== undefined
          ? input.description
          : existing.description,
        input.steps ?? existing.steps,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapFunction(row) : null;
  }

  async deleteFunction(id: string): Promise<DeleteFunctionResult> {
    const existing = await this.getFunction(id);
    if (!existing) return { ok: false, error: "not_found" };
    const dependents = await this.countCustomApisByFunction(id);
    if (dependents > 0) {
      return { ok: false, error: "has_dependents", dependents };
    }
    const result = await this.exec(
      `DELETE FROM jord_functions WHERE id = $1`,
      [id],
    );
    if ((result.rowCount ?? 0) === 0) return { ok: false, error: "not_found" };
    return { ok: true };
  }

  async listCustomApis(): Promise<JordCustomApi[]> {
    const result = await this.exec(
      `SELECT * FROM jord_custom_apis ORDER BY created_at DESC`,
    );
    return result.rows.map(mapCustomApi);
  }

  async getCustomApi(id: string): Promise<JordCustomApi | null> {
    const result = await this.exec(
      `SELECT * FROM jord_custom_apis WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async getCustomApiByMethodSlug(
    method: JordHttpMethod,
    slug: string,
  ): Promise<JordCustomApi | null> {
    const result = await this.exec(
      `SELECT * FROM jord_custom_apis WHERE method = $1 AND slug = $2 LIMIT 1`,
      [method, slug],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async insertCustomApi(input: InsertCustomApiInput): Promise<JordCustomApi> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_custom_apis
         (id, name, method, slug, function_id, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        input.name,
        input.method,
        input.slug,
        input.functionId,
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapCustomApi(result.rows[0]!);
  }

  async updateCustomApi(
    input: UpdateCustomApiInput,
  ): Promise<JordCustomApi | null> {
    const existing = await this.getCustomApi(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.exec(
      `UPDATE jord_custom_apis SET
         name = $1, method = $2, slug = $3, function_id = $4,
         enabled = $5, updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.method ?? existing.method,
        input.slug ?? existing.slug,
        input.functionId ?? existing.functionId,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapCustomApi(row) : null;
  }

  async deleteCustomApi(id: string): Promise<boolean> {
    const result = await this.exec(
      `DELETE FROM jord_custom_apis WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async countCustomApisByFunction(functionId: string): Promise<number> {
    const result = await this.exec(
      `SELECT COUNT(*)::int AS n FROM jord_custom_apis WHERE function_id = $1`,
      [functionId],
    );
    return num(result.rows[0]?.n);
  }

  async listPolicies(): Promise<JordPolicy[]> {
    const result = await this.exec(
      `SELECT * FROM jord_policies ORDER BY priority DESC, created_at DESC`,
    );
    return result.rows.map(mapPolicy);
  }

  async getPolicy(id: string): Promise<JordPolicy | null> {
    const result = await this.exec(
      `SELECT * FROM jord_policies WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapPolicy(row) : null;
  }

  async listPoliciesFor(
    tableName: string,
    operation: JordPolicyOperation,
  ): Promise<JordPolicy[]> {
    const result = await this.exec(
      `SELECT * FROM jord_policies
       WHERE table_name = $1 AND operation = $2 AND enabled = TRUE`,
      [tableName, operation],
    );
    const mapped = result.rows.map(mapPolicy);
    mapped.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.effect !== b.effect) {
        if (a.effect === "deny") return -1;
        if (b.effect === "deny") return 1;
      }
      return b.createdAt - a.createdAt;
    });
    return mapped;
  }

  async insertPolicy(input: InsertPolicyInput): Promise<JordPolicy> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_policies
         (id, name, table_name, operation, effect, rules, priority, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        id,
        input.name,
        input.tableName,
        input.operation,
        input.effect,
        input.rules ?? "[]",
        input.priority ?? 0,
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapPolicy(result.rows[0]!);
  }

  async updatePolicy(input: UpdatePolicyInput): Promise<JordPolicy | null> {
    const existing = await this.getPolicy(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.exec(
      `UPDATE jord_policies SET
         name = $1, table_name = $2, operation = $3, effect = $4,
         rules = $5, priority = $6, enabled = $7, updated_at = $8
       WHERE id = $9
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.tableName ?? existing.tableName,
        input.operation ?? existing.operation,
        input.effect ?? existing.effect,
        input.rules ?? existing.rules,
        input.priority ?? existing.priority,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapPolicy(row) : null;
  }

  async deletePolicy(id: string): Promise<boolean> {
    const result = await this.exec(
      `DELETE FROM jord_policies WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listTriggers(): Promise<JordTrigger[]> {
    const result = await this.exec(
      `SELECT * FROM jord_triggers ORDER BY created_at DESC`,
    );
    return result.rows.map(mapTrigger);
  }

  async getTrigger(id: string): Promise<JordTrigger | null> {
    const result = await this.exec(
      `SELECT * FROM jord_triggers WHERE id = $1 LIMIT 1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapTrigger(row) : null;
  }

  async listTriggersFor(
    tableName: string,
    event: JordTriggerEvent,
  ): Promise<JordTrigger[]> {
    const result = await this.exec(
      `SELECT * FROM jord_triggers
       WHERE table_name = $1 AND event = $2 AND enabled = TRUE
       ORDER BY created_at DESC`,
      [tableName, event],
    );
    return result.rows.map(mapTrigger);
  }

  async insertTrigger(input: InsertTriggerInput): Promise<JordTrigger> {
    const now = Date.now();
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_triggers
         (id, name, table_name, timing, event, actions, enabled, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        id,
        input.name,
        input.tableName,
        input.timing ?? "after",
        input.event,
        input.actions ?? "[]",
        input.enabled ?? true,
        now,
        now,
      ],
    );
    return mapTrigger(result.rows[0]!);
  }

  async updateTrigger(input: UpdateTriggerInput): Promise<JordTrigger | null> {
    const existing = await this.getTrigger(input.id);
    if (!existing) return null;
    const now = Date.now();
    const result = await this.exec(
      `UPDATE jord_triggers SET
         name = $1, table_name = $2, timing = $3, event = $4,
         actions = $5, enabled = $6, updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [
        input.name ?? existing.name,
        input.tableName ?? existing.tableName,
        input.timing ?? existing.timing,
        input.event ?? existing.event,
        input.actions ?? existing.actions,
        input.enabled ?? existing.enabled,
        now,
        input.id,
      ],
    );
    const row = result.rows[0];
    return row ? mapTrigger(row) : null;
  }

  async deleteTrigger(id: string): Promise<boolean> {
    const result = await this.exec(
      `DELETE FROM jord_triggers WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  compileTriggerSql(_def: JordTrigger): string | null {
    return null;
  }

  async listSchemas(): Promise<JordSchemaInfo[]> {
    const result = await this.exec(
      `SELECT nspname AS name
       FROM pg_catalog.pg_namespace
       WHERE nspname !~ '^pg_'
         AND nspname <> 'information_schema'
         AND has_schema_privilege(current_user, nspname, 'USAGE')
       ORDER BY nspname`,
    );
    return result.rows
      .map((row) => String(row.name))
      .filter((name) => isValidSqlIdent(name))
      .map((name) => ({ name, readOnly: false }));
  }

  async resolveSchema(input?: string | null): Promise<ResolveSchemaResult> {
    const wanted = input == null || input === "" ? this.defaultSchema : input;
    if (!isValidSqlIdent(wanted)) return unknownSchemaFailure(wanted);
    const schemas = await this.listSchemas();
    if (schemas.some((s) => s.name === wanted)) {
      return { ok: true, schema: wanted };
    }
    return unknownSchemaFailure(wanted);
  }

  /**
   * Schema for a table operation. The default schema skips the catalog
   * lookup (it is what every pre-S0049 call used); anything else is validated.
   */
  private async scope(
    schemaName?: string,
  ): Promise<ResolveSchemaResult> {
    if (schemaName == null || schemaName === "" || schemaName === this.defaultSchema) {
      return { ok: true, schema: this.defaultSchema };
    }
    return this.resolveSchema(schemaName);
  }

  async listTables(schemaName?: string): Promise<string[]> {
    const scoped = await this.scope(schemaName);
    if (!scoped.ok) return [];
    const result = await this.exec(
      `SELECT tablename AS name
       FROM pg_catalog.pg_tables
       WHERE schemaname = $1
       ORDER BY tablename`,
      [scoped.schema],
    );
    return result.rows.map((r) => String(r.name));
  }

  async describeTable(
    name: string,
    schemaName?: string,
  ): Promise<JordTableInfo | null> {
    if (!isValidSqlIdent(name)) return null;
    const scoped = await this.scope(schemaName);
    if (!scoped.ok) return null;
    const tables = await this.listTables(scoped.schema);
    if (!tables.includes(name)) return null;

    const result = await this.exec(
      `SELECT
         a.attname AS name,
         pg_catalog.format_type(a.atttypid, a.atttypmod) AS type,
         a.attnotnull AS notnull,
         CASE WHEN EXISTS (
           SELECT 1 FROM pg_constraint c
           WHERE c.conrelid = a.attrelid AND a.attnum = ANY (c.conkey) AND c.contype = 'p'
         ) THEN true ELSE false END AS pk,
         pg_get_expr(ad.adbin, ad.adrelid) AS dflt_value
       FROM pg_attribute a
       JOIN pg_class c ON a.attrelid = c.oid
       JOIN pg_namespace n ON c.relnamespace = n.oid
       LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
       WHERE n.nspname = $2
         AND c.relname = $1
         AND a.attnum > 0
         AND NOT a.attisdropped
       ORDER BY a.attnum`,
      [name, scoped.schema],
    );

    const rawColumns: JordColumnInfo[] = result.rows.map((r) => ({
      name: String(r.name),
      type: String(r.type ?? ""),
      notnull: bool(r.notnull),
      pk: bool(r.pk),
      dflt_value: r.dflt_value == null ? null : String(r.dflt_value),
    }));
    const columns = normalizeColumns("postgres", rawColumns);
    return { name, schema: scoped.schema, columns };
  }

  async addColumn(input: AddColumnInput): Promise<AddColumnResult> {
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    if (!isValidSqlIdent(input.table) || !isValidSqlIdent(input.name)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table and column names must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    if (!isJordColumnType(input.type)) {
      return {
        ok: false,
        error: "invalid_type",
        message: `type must be one of TEXT, INTEGER, REAL, BLOB (got ${JSON.stringify(input.type)})`,
      };
    }

    const described = await this.describeTable(input.table, scoped.schema);
    if (!described) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${input.table} not found`,
      };
    }
    if (described.columns.some((c) => c.name === input.name)) {
      return {
        ok: false,
        error: "column_exists",
        message: `column ${input.name} already exists on ${input.table}`,
      };
    }

    const pgType = pgColumnType(input.type);
    await this.exec(
      `ALTER TABLE ${quoteQualified(scoped.schema, input.table)} ADD COLUMN ${quoteIdent(input.name)} ${pgType}`,
    );
    return { ok: true };
  }

  async createTable(input: CreateTableInput): Promise<CreateTableResult> {
    const plan = planCreateTable(input);
    if (!plan.ok) return plan;
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    const existing = await this.describeTable(plan.name, scoped.schema);
    if (existing) {
      return {
        ok: false,
        error: "table_exists",
        message: `table ${plan.name} already exists`,
      };
    }
    const sql = buildCreateTableSql(
      plan.name,
      plan.columns,
      "postgres",
      scoped.schema,
    );
    await this.exec(sql);
    return { ok: true, sql };
  }

  async listTableRows(input: ListTableRowsInput): Promise<ListTableRowsResult> {
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    if (!isValidSqlIdent(input.table)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    const described = await this.describeTable(input.table, scoped.schema);
    if (!described) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${input.table} not found`,
      };
    }
    const window = clampRowWindow(input.limit, input.offset);
    const columns = described.columns.map((col) => col.name);
    const args: Array<string | number | null> = [];
    const where = input.rowScope
      ? ` WHERE ${rowScopeSql(input.rowScope, columns, args, (n) => `$${n}`)}`
      : "";
    args.push(window.limit, window.offset);
    const result = await this.exec(
      `SELECT * FROM ${quoteQualified(scoped.schema, input.table)}${where} LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args,
    );
    const rows = result.rows.map((row) => {
      const out: Record<string, ReturnType<typeof toTableCell>> = {};
      for (const name of columns) {
        out[name] = toTableCell(row[name]);
      }
      return out;
    });
    return { ok: true, columns, rows, limit: window.limit, offset: window.offset };
  }

  async insertTableRow(input: InsertTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table, input.schema);
    if (!described.ok) return described;
    const plan = planInsertRow(described.info, input.values);
    if (!plan.ok) return plan;
    const target = quoteQualified(described.schema, plan.table);
    const existing = await this.exec(
      `SELECT 1 AS hit FROM ${target} WHERE ${quoteIdent(plan.pkColumn)} = $1 LIMIT 1`,
      [plan.pkValue],
    );
    if (existing.rows.length > 0) {
      return {
        ok: false,
        error: "pk_exists",
        message: "primary key already exists",
      };
    }
    const cols = plan.columns.map((name) => quoteIdent(name)).join(", ");
    const marks = plan.columns.map((_, i) => `$${i + 1}`).join(", ");
    await this.exec(
      `INSERT INTO ${target} (${cols}) VALUES (${marks})`,
      plan.args,
    );
    return { ok: true };
  }

  async updateTableRow(input: UpdateTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table, input.schema);
    if (!described.ok) return described;
    const plan = planUpdateRow(described.info, input.pk, input.values);
    if (!plan.ok) return plan;
    const sets = plan.setColumns
      .map((name, i) => `${quoteIdent(name)} = $${i + 1}`)
      .join(", ");
    const result = await this.exec(
      `UPDATE ${quoteQualified(described.schema, plan.table)} SET ${sets} WHERE ${quoteIdent(plan.pkColumn)} = $${plan.setColumns.length + 1}`,
      [...plan.args, plan.pkValue],
    );
    if ((result.rowCount ?? 0) === 0) {
      return { ok: false, error: "not_found", message: "row not found" };
    }
    return { ok: true };
  }

  async deleteTableRow(input: DeleteTableRowInput): Promise<MutateTableRowResult> {
    const described = await this.openUserTable(input.table, input.schema);
    if (!described.ok) return described;
    const plan = planDeleteRow(described.info, input.pk);
    if (!plan.ok) return plan;
    const result = await this.exec(
      `DELETE FROM ${quoteQualified(described.schema, plan.table)} WHERE ${quoteIdent(plan.pkColumn)} = $1`,
      [plan.pkValue],
    );
    if ((result.rowCount ?? 0) === 0) {
      return { ok: false, error: "not_found", message: "row not found" };
    }
    return { ok: true };
  }

  async dropTable(input: DropTableInput): Promise<SchemaDdlResult> {
    const plan = planDropTable(input.name);
    if (!plan.ok) return plan;
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    const existing = await this.describeTable(plan.name, scoped.schema);
    if (!existing) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${plan.name} not found`,
      };
    }
    await this.exec(`DROP TABLE ${quoteQualified(scoped.schema, plan.name)}`);
    return { ok: true };
  }

  async renameTable(input: RenameTableInput): Promise<SchemaDdlResult> {
    const plan = planRenameTable(input.name, input.newName);
    if (!plan.ok) return plan;
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    const schemaName = scoped.schema;
    const existing = await this.describeTable(plan.from, schemaName);
    if (!existing) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${plan.from} not found`,
      };
    }
    const conflict = await this.describeTable(plan.to, schemaName);
    if (conflict) {
      return {
        ok: false,
        error: "table_exists",
        message: `table ${plan.to} already exists`,
      };
    }
    await this.transaction(async () => {
      await this.exec(
        `ALTER TABLE ${quoteQualified(schemaName, plan.from)} RENAME TO ${quoteIdent(plan.to)}`,
      );
      for (const meta of TABLE_NAME_METADATA) {
        // jord_policies / jord_triggers are table_name-only (S0049); the
        // schema-scoped tables must not move a same-named table elsewhere.
        if (SCHEMA_SCOPED_METADATA.has(meta)) {
          await this.exec(
            `UPDATE ${meta} SET table_name = $1 WHERE table_name = $2 AND schema_name = $3`,
            [plan.to, plan.from, schemaName],
          );
        } else {
          await this.exec(`UPDATE ${meta} SET table_name = $1 WHERE table_name = $2`, [
            plan.to,
            plan.from,
          ]);
        }
      }
      // Compiled policies keep the old name; the caller's RLS sync recreates them.
      const stale = await this.exec(
        `SELECT policyname FROM pg_policies
         WHERE schemaname = $2 AND tablename = $1 AND policyname LIKE 'jord\\_rls\\_%'`,
        [plan.to, schemaName],
      );
      for (const row of stale.rows as Array<{ policyname: string }>) {
        await this.exec(
          `DROP POLICY IF EXISTS ${quoteIdent(row.policyname)} ON ${quoteQualified(schemaName, plan.to)}`,
        );
      }
    });
    return { ok: true };
  }

  async dropColumn(input: DropColumnInput): Promise<SchemaDdlResult> {
    const gate = requireUserTableName(input.table);
    if (!gate.ok) return gate;
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    const info = await this.describeTable(gate.name, scoped.schema);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${gate.name} not found`,
      };
    }
    const plan = planDropColumn(info, input.column);
    if (!plan.ok) return plan;
    await this.exec(
      `ALTER TABLE ${quoteQualified(scoped.schema, plan.table)} DROP COLUMN ${quoteIdent(plan.column)}`,
    );
    return { ok: true };
  }

  async alterColumn(input: AlterColumnInput): Promise<SchemaDdlResult> {
    const gate = requireUserTableName(input.table);
    if (!gate.ok) return gate;
    const scoped = await this.scope(input.schema);
    if (!scoped.ok) return scoped;
    const schemaName = scoped.schema;
    const info = await this.describeTable(gate.name, schemaName);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${gate.name} not found`,
      };
    }
    const plan = planAlterColumn(info, input.column, {
      name: input.name,
      type: input.type,
    });
    if (!plan.ok) return plan;

    if (plan.mode === "rename") {
      await this.exec(
        `ALTER TABLE ${quoteQualified(schemaName, plan.table)} RENAME COLUMN ${quoteIdent(plan.from)} TO ${quoteIdent(plan.to)}`,
      );
      return { ok: true };
    }

    const temp = rebuildTempName(plan.table);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // A non-superuser owner is filtered by FORCE RLS and would copy no rows.
      await client.query(
        `ALTER TABLE ${quoteQualified(schemaName, plan.table)} NO FORCE ROW LEVEL SECURITY`,
      );
      await client.query(
        buildRebuildCreateSql(temp, plan.columns, "postgres", schemaName),
      );
      await client.query(
        buildRebuildCopySql(
          plan.table,
          temp,
          info,
          plan.from,
          plan.to,
          plan.nextType,
          "postgres",
          schemaName,
        ),
      );
      await client.query(`DROP TABLE ${quoteQualified(schemaName, plan.table)}`);
      await client.query(
        `ALTER TABLE ${quoteQualified(schemaName, temp)} RENAME TO ${quoteIdent(plan.table)}`,
      );
      await client.query("COMMIT");
      return { ok: true };
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      try {
        await this.exec(
          `DROP TABLE IF EXISTS ${quoteQualified(schemaName, temp)}`,
        );
      } catch {
        /* ignore cleanup */
      }
      return {
        ok: false,
        error: "type_change_failed",
        message:
          err instanceof Error ? err.message : "column type change failed",
      };
    } finally {
      client.release();
    }
  }

  private async openUserTable(
    table: string,
    schemaName?: string,
  ): Promise<
    | { ok: true; info: JordTableInfo; schema: string }
    | {
        ok: false;
        error:
          | "invalid_identifier"
          | "reserved"
          | "table_not_found"
          | "unknown_schema";
        message: string;
      }
  > {
    const scoped = await this.scope(schemaName);
    if (!scoped.ok) return scoped;
    if (!isValidSqlIdent(table)) {
      return {
        ok: false,
        error: "invalid_identifier",
        message: "table name must match [a-zA-Z_][a-zA-Z0-9_]*",
      };
    }
    if (isReservedCreateTableName(table)) {
      return {
        ok: false,
        error: "reserved",
        message: `table ${table} is reserved`,
      };
    }
    const info = await this.describeTable(table, scoped.schema);
    if (!info) {
      return {
        ok: false,
        error: "table_not_found",
        message: `table ${table} not found`,
      };
    }
    return { ok: true, info, schema: scoped.schema };
  }

  async listBlobBuckets(): Promise<string[]> {
    const result = await this.exec(
      `SELECT DISTINCT bucket FROM jord_blobs ORDER BY bucket ASC`,
    );
    return result.rows.map((row) => String(row.bucket));
  }

  async listBlobs(bucket: string): Promise<JordBlob[]> {
    const result = await this.exec(
      `SELECT * FROM jord_blobs WHERE bucket = $1 ORDER BY key ASC`,
      [bucket],
    );
    return result.rows.map(mapBlob);
  }

  async getBlobMeta(bucket: string, key: string): Promise<JordBlob | null> {
    const result = await this.exec(
      `SELECT * FROM jord_blobs WHERE bucket = $1 AND key = $2 LIMIT 1`,
      [bucket, key],
    );
    const row = result.rows[0];
    return row ? mapBlob(row) : null;
  }

  async upsertBlobMeta(input: UpsertBlobMetaInput): Promise<JordBlob> {
    const existing = await this.getBlobMeta(input.bucket, input.key);
    const now = Date.now();
    const status = input.status ?? "ready";
    const pendingExpiresAt =
      input.pendingExpiresAt !== undefined
        ? input.pendingExpiresAt
        : status === "ready"
          ? null
          : (existing?.pendingExpiresAt ?? null);
    const uploadId =
      input.uploadId !== undefined
        ? input.uploadId
        : (existing?.uploadId ?? null);
    if (existing) {
      const result = await this.exec(
        `UPDATE jord_blobs SET
           content_type = $1, size = $2, etag = $3, status = $4,
           pending_expires_at = $5, upload_id = $6, updated_at = $7
         WHERE id = $8
         RETURNING *`,
        [
          input.contentType,
          input.size,
          input.etag,
          status,
          pendingExpiresAt,
          uploadId,
          now,
          existing.id,
        ],
      );
      return mapBlob(result.rows[0]!);
    }
    const id = randomUUID();
    const result = await this.exec(
      `INSERT INTO jord_blobs (
         id, bucket, key, content_type, size, etag, status,
         pending_expires_at, upload_id, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        id,
        input.bucket,
        input.key,
        input.contentType,
        input.size,
        input.etag,
        status,
        pendingExpiresAt,
        uploadId,
        now,
        now,
      ],
    );
    return mapBlob(result.rows[0]!);
  }

  async deleteBlobMeta(bucket: string, key: string): Promise<boolean> {
    const result = await this.exec(
      `DELETE FROM jord_blobs WHERE bucket = $1 AND key = $2`,
      [bucket, key],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listExpiredPendingBlobs(nowMs: number): Promise<JordBlob[]> {
    const result = await this.exec(
      `SELECT * FROM jord_blobs
       WHERE status = 'pending'
         AND pending_expires_at IS NOT NULL
         AND pending_expires_at <= $1
       ORDER BY pending_expires_at ASC`,
      [nowMs],
    );
    return result.rows.map(mapBlob);
  }

  async listAllBlobMeta(): Promise<JordBlob[]> {
    const result = await this.exec(
      `SELECT * FROM jord_blobs ORDER BY bucket ASC, key ASC`,
    );
    return result.rows.map(mapBlob);
  }

  async listVectorNamespaces(): Promise<string[]> {
    const result = await this.exec(
      `SELECT DISTINCT namespace FROM jord_embeddings ORDER BY namespace ASC`,
    );
    return result.rows.map((row) => String(row.namespace));
  }

  async listEmbeddings(namespace: string): Promise<JordEmbeddingMeta[]> {
    const result = await this.exec(
      `SELECT id, namespace, ref_id, dims, metadata, created_at, updated_at
       FROM jord_embeddings WHERE namespace = $1 ORDER BY updated_at DESC`,
      [namespace],
    );
    return result.rows.map(mapEmbeddingMeta);
  }

  async getEmbedding(
    namespace: string,
    id: string,
  ): Promise<JordEmbeddingMeta | null> {
    const result = await this.exec(
      `SELECT id, namespace, ref_id, dims, metadata, created_at, updated_at
       FROM jord_embeddings WHERE namespace = $1 AND id = $2 LIMIT 1`,
      [namespace, id],
    );
    const row = result.rows[0];
    return row ? mapEmbeddingMeta(row) : null;
  }

  async upsertEmbedding(
    input: UpsertEmbeddingInput,
  ): Promise<UpsertEmbeddingResult> {
    if (!isValidVectorNamespace(input.namespace)) {
      return {
        ok: false,
        error: "invalid_namespace",
        message: "namespace must match [a-z0-9][a-z0-9_-]{0,62}",
      };
    }
    const checked = validateEmbeddingArray(input.embedding);
    if (!checked.ok) {
      return { ok: false, error: "invalid_embedding", message: checked.message };
    }
    const dims = checked.values.length;
    const sample = await this.listEmbeddings(input.namespace);
    if (sample.length > 0 && sample[0]!.dims !== dims) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${sample[0]!.dims}, got ${dims}`,
      };
    }
    const now = Date.now();
    const blob = packF32(checked.values);
    const vec =
      this.vectorBackend === "pgvector"
        ? toVectorLiteral(padEmbedding(checked.values))
        : null;
    const existing = await this.getEmbedding(input.namespace, input.id);
    if (existing) {
      const result = vec
        ? await this.exec(
            `UPDATE jord_embeddings SET
               ref_id = $1, dims = $2, embedding = $3, metadata = $4, updated_at = $5,
               embedding_vec = $6::vector
             WHERE namespace = $7 AND id = $8
             RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
            [
              input.refId !== undefined ? input.refId : existing.refId,
              dims,
              blob,
              input.metadata !== undefined ? input.metadata : existing.metadata,
              now,
              vec,
              input.namespace,
              input.id,
            ],
          )
        : await this.exec(
            `UPDATE jord_embeddings SET
               ref_id = $1, dims = $2, embedding = $3, metadata = $4, updated_at = $5
             WHERE namespace = $6 AND id = $7
             RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
            [
              input.refId !== undefined ? input.refId : existing.refId,
              dims,
              blob,
              input.metadata !== undefined ? input.metadata : existing.metadata,
              now,
              input.namespace,
              input.id,
            ],
          );
      return { ok: true, row: mapEmbeddingMeta(result.rows[0]!) };
    }
    const result = vec
      ? await this.exec(
          `INSERT INTO jord_embeddings (
             id, namespace, ref_id, dims, embedding, metadata, created_at, updated_at, embedding_vec
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector)
           RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
          [
            input.id,
            input.namespace,
            input.refId ?? null,
            dims,
            blob,
            input.metadata ?? null,
            now,
            now,
            vec,
          ],
        )
      : await this.exec(
          `INSERT INTO jord_embeddings (
             id, namespace, ref_id, dims, embedding, metadata, created_at, updated_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, namespace, ref_id, dims, metadata, created_at, updated_at`,
          [
            input.id,
            input.namespace,
            input.refId ?? null,
            dims,
            blob,
            input.metadata ?? null,
            now,
            now,
          ],
        );
    return { ok: true, row: mapEmbeddingMeta(result.rows[0]!) };
  }

  async deleteEmbedding(namespace: string, id: string): Promise<boolean> {
    const result = await this.exec(
      `DELETE FROM jord_embeddings WHERE namespace = $1 AND id = $2`,
      [namespace, id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async searchVectors(input: SearchVectorsInput): Promise<SearchVectorsResult> {
    if (!isValidVectorNamespace(input.namespace)) {
      return {
        ok: false,
        error: "invalid_namespace",
        message: "namespace must match [a-z0-9][a-z0-9_-]{0,62}",
      };
    }
    const checked = validateEmbeddingArray(input.embedding);
    if (!checked.ok) {
      return { ok: false, error: "invalid_embedding", message: checked.message };
    }
    const sample = await this.exec(
      `SELECT dims FROM jord_embeddings WHERE namespace = $1 LIMIT 1`,
      [input.namespace],
    );
    if (sample.rows.length === 0) {
      return { ok: true, hits: [], backend: this.vectorBackend };
    }
    const dims = num(sample.rows[0]!.dims);
    if (dims !== checked.values.length) {
      return {
        ok: false,
        error: "dims_mismatch",
        message: `namespace ${input.namespace} expects dims ${dims}, got ${checked.values.length}`,
      };
    }
    if (this.vectorBackend === "pgvector") {
      try {
        const hits = await this.searchWithPgvector(
          input.namespace,
          checked.values,
          input.limit,
        );
        return { ok: true, hits, backend: "pgvector" };
      } catch {
        // Extension or column missing — rank blobs in process.
      }
    }
    const result = await this.exec(
      `SELECT id, ref_id, dims, embedding, metadata FROM jord_embeddings WHERE namespace = $1`,
      [input.namespace],
    );
    const hits = rankByCosine(
      checked.values,
      result.rows.map((r) => ({
        id: String(r.id),
        refId: r.ref_id == null ? null : String(r.ref_id),
        dims: num(r.dims),
        embedding: asBuffer(r.embedding),
        metadata: r.metadata == null ? null : String(r.metadata),
      })),
      input.limit,
    );
    return { ok: true, hits, backend: "cosine" };
  }

  private mapPgHit(row: QueryResultRow): VectorSearchHit {
    return {
      id: String(row.id),
      refId: row.ref_id == null ? null : String(row.ref_id),
      score: num(row.score),
      metadata: row.metadata == null ? null : String(row.metadata),
      dims: num(row.dims),
    };
  }

  private async backfillPgvector(namespace: string): Promise<void> {
    const missing = await this.exec(
      `SELECT id, embedding FROM jord_embeddings
       WHERE namespace = $1 AND embedding_vec IS NULL`,
      [namespace],
    );
    for (const row of missing.rows) {
      const values = unpackF32(asBuffer(row.embedding));
      await this.exec(
        `UPDATE jord_embeddings SET embedding_vec = $1::vector WHERE id = $2`,
        [toVectorLiteral(padEmbedding(values)), row.id],
      );
    }
  }

  private async searchWithPgvector(
    namespace: string,
    values: number[],
    limit: number | undefined,
  ): Promise<VectorSearchHit[]> {
    await this.backfillPgvector(namespace);
    const literal = toVectorLiteral(padEmbedding(values));
    const top = clampSearchLimit(limit);
    const result = await this.exec(
      `SELECT id, ref_id, dims, metadata,
              1 - (embedding_vec <=> $1::vector) AS score
       FROM jord_embeddings
       WHERE namespace = $2 AND embedding_vec IS NOT NULL
       ORDER BY embedding_vec <=> $1::vector
       LIMIT $3`,
      [literal, namespace, top],
    );
    return result.rows.map((row) => this.mapPgHit(row));
  }

  async snapshotTo(_destPath: string): Promise<string> {
    throw new JordUnsupportedError("snapshotTo", this.dialect);
  }
}
