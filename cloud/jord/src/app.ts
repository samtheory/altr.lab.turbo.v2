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
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

import {
  createAuthMiddleware,
  requireAlterSchema,
  requireManageApis,
  requireWriteRecords,
  type JordAuthConfig,
  type JordAuthVariables,
} from "./auth/index.js";
import {
  buildRecordsResource,
  createGeneratedApiRegistry,
  isGeneratedApiResourceId,
  type GeneratedApiRegistry,
} from "./generated-api/index.js";
import type { WriteQueue } from "./queue.js";

export type JordAppDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
  auth: JordAuthConfig;
  /** Defaults to env-seeded registry when omitted. */
  generatedApi?: GeneratedApiRegistry;
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

function requireGeneratedEnabled(
  registry: GeneratedApiRegistry,
  resource: string,
) {
  return createMiddleware<{ Variables: JordAuthVariables }>(
    async (c, next) => {
      if (!registry.isEnabled(resource)) {
        return c.json(
          {
            error: "api_disabled",
            resource,
            message: `Generated API resource "${resource}" is disabled`,
          },
          503,
        );
      }
      await next();
    },
  );
}

export function createJordApp(deps: JordAppDeps) {
  const app = new Hono<{ Variables: JordAuthVariables }>();
  const requireAuth = createAuthMiddleware(deps.auth);
  const generatedApi =
    deps.generatedApi ?? createGeneratedApiRegistry(process.env);

  app.get("/health", (c) =>
    c.json({ ok: true as const, dialect: "libsql" as const }),
  );

  const protectedRoutes = new Hono<{ Variables: JordAuthVariables }>();
  protectedRoutes.use("*", requireAuth);

  protectedRoutes.get("/apis/generated", (c) => {
    return c.json({
      resources: [buildRecordsResource(generatedApi.isEnabled("records"))],
    });
  });

  protectedRoutes.get("/apis/generated/:resource", (c) => {
    const resource = c.req.param("resource");
    if (!isGeneratedApiResourceId(resource)) {
      throw new HTTPException(404, { message: "resource not found" });
    }
    return c.json(buildRecordsResource(generatedApi.isEnabled(resource)));
  });

  protectedRoutes.patch(
    "/apis/generated/:resource",
    requireManageApis(),
    async (c) => {
      const resource = c.req.param("resource");
      if (!isGeneratedApiResourceId(resource)) {
        throw new HTTPException(404, { message: "resource not found" });
      }
      const body = await c.req.json<{ enabled?: boolean }>();
      if (typeof body.enabled !== "boolean") {
        throw new HTTPException(400, {
          message: "enabled (boolean) is required",
        });
      }
      generatedApi.setEnabled(resource, body.enabled);
      return c.json(buildRecordsResource(generatedApi.isEnabled(resource)));
    },
  );

  protectedRoutes.get("/schema/tables", async (c) => {
    const tables = await deps.jord.listTables();
    return c.json({ tables });
  });

  protectedRoutes.get("/schema/tables/:name", async (c) => {
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

  protectedRoutes.post(
    "/schema/tables/:name/columns",
    requireAlterSchema(),
    async (c) => {
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
      const preview =
        isValidSqlIdent(table) && isValidSqlIdent(body.name)
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
      return c.json({ ok: true as const, sql: preview, table: info }, 201);
    },
  );

  const recordsRoutes = new Hono<{ Variables: JordAuthVariables }>();
  recordsRoutes.use("*", requireGeneratedEnabled(generatedApi, "records"));

  recordsRoutes.post("/", requireWriteRecords(), async (c) => {
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

  recordsRoutes.get("/", async (c) => {
    const bucket = c.req.query("bucket");
    if (!bucket) {
      throw new HTTPException(400, { message: "query bucket= is required" });
    }
    const rows = await deps.jord.listRecordsByBucket(bucket);
    return c.json(rows.map(publicRecord));
  });

  recordsRoutes.get("/:id", async (c) => {
    const row = await deps.jord.getRecord(c.req.param("id"));
    if (!row) {
      throw new HTTPException(404, { message: "record not found" });
    }
    return c.json(publicRecord(row));
  });

  recordsRoutes.patch("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
      version?: number;
      body?: string;
      metadata?: string | null;
      bucket?: string;
    }>();
    if (typeof body.version !== "number") {
      throw new HTTPException(400, {
        message: "version (number) is required",
      });
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

  recordsRoutes.delete("/:id", requireWriteRecords(), async (c) => {
    const id = c.req.param("id");
    const deleted = await deps.enqueueWrite(() => deps.jord.deleteRecord(id));
    if (!deleted) {
      throw new HTTPException(404, { message: "record not found" });
    }
    return c.json({ ok: true as const, id });
  });

  protectedRoutes.route("/records", recordsRoutes);

  app.route("/", protectedRoutes);

  return app;
}

export type JordApp = ReturnType<typeof createJordApp>;
