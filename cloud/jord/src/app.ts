import type {
  JordColumnType,
  JordDriverPort,
  JordRecord,
} from "@altr/jord";
import {
  buildAddColumnSql,
  isJordColumnType,
  isValidSqlIdent,
} from "@altr/jord";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { WriteQueue } from "./queue.js";

export type JordAppDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
};

function publicRecord(row: JordRecord) {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    version: row.version,
  };
}

export function createJordApp(deps: JordAppDeps) {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({ ok: true as const, dialect: "libsql" as const }),
  );

  app.get("/schema/tables", async (c) => {
    const tables = await deps.jord.listTables();
    return c.json({ tables });
  });

  app.get("/schema/tables/:name", async (c) => {
    const name = c.req.param("name");
    if (!isValidSqlIdent(name)) {
      throw new HTTPException(400, { message: "invalid table name" });
    }
    const info = await deps.jord.describeTable(name);
    if (!info) {
      throw new HTTPException(404, { message: "table not found" });
    }
    return c.json(info);
  });

  app.post("/schema/tables/:name/columns", async (c) => {
    const table = c.req.param("name");
    const body = await c.req.json<{ name?: string; type?: string }>();
    if (typeof body.name !== "string" || typeof body.type !== "string") {
      throw new HTTPException(400, {
        message: "name and type (string) are required",
      });
    }
    if (!isJordColumnType(body.type)) {
      throw new HTTPException(400, {
        message: "type must be TEXT, INTEGER, REAL, or BLOB",
      });
    }
    const type = body.type as JordColumnType;
    const preview = isValidSqlIdent(table) && isValidSqlIdent(body.name)
      ? buildAddColumnSql(table, body.name, type)
      : null;

    const result = await deps.enqueueWrite(() =>
      deps.jord.addColumn({ table, name: body.name!, type }),
    );

    if (!result.ok) {
      const status =
        result.error === "table_not_found"
          ? 404
          : result.error === "column_exists"
            ? 409
            : 400;
      return c.json(
        { error: result.error, message: result.message, sql: preview },
        status,
      );
    }

    const info = await deps.jord.describeTable(table);
    return c.json(
      { ok: true as const, sql: preview, table: info },
      201,
    );
  });

  app.post("/records", async (c) => {
    const body = await c.req.json<{
      bucket?: string;
      body?: string;
      metadata?: string | null;
    }>();
    if (!body.bucket || typeof body.body !== "string") {
      throw new HTTPException(400, {
        message: "bucket and body (string) are required",
      });
    }

    const row = await deps.enqueueWrite(() =>
      deps.jord.insertRecord({
        bucket: body.bucket!,
        body: body.body!,
        metadata: body.metadata,
      }),
    );
    return c.json(publicRecord(row), 201);
  });

  app.get("/records", async (c) => {
    const bucket = c.req.query("bucket");
    if (!bucket) {
      throw new HTTPException(400, { message: "query bucket= is required" });
    }
    const rows = await deps.jord.listRecordsByBucket(bucket);
    return c.json(rows.map(publicRecord));
  });

  app.get("/records/:id", async (c) => {
    const row = await deps.jord.getRecord(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "record not found" });
    }
    return c.json(publicRecord(row));
  });

  app.patch("/records/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
      version?: number;
      body?: string;
      metadata?: string | null;
      bucket?: string;
    }>();
    if (typeof body.version !== "number") {
      throw new HTTPException(400, { message: "version (number) is required" });
    }

    const result = await deps.enqueueWrite(() =>
      deps.jord.updateRecord({
        id,
        version: body.version!,
        body: body.body,
        metadata: body.metadata,
        bucket: body.bucket,
      }),
    );

    if (!result.ok) {
      return c.json(
        { error: "version_conflict", message: "stale version" },
        409,
      );
    }
    return c.json(publicRecord(result.record));
  });

  return app;
}

export type JordApp = ReturnType<typeof createJordApp>;
