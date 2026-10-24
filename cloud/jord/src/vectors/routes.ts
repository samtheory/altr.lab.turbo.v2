import {
  isValidVectorNamespace,
  type JordDriverPort,
  type JordEmbeddingMeta,
  type VectorSearchHit,
} from "@altr/jord";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/index.js";
import { requireWriteVectors } from "../auth/middleware.js";
import type { WriteQueue } from "../queue.js";

export type VectorRouteDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
};

function publicMeta(row: JordEmbeddingMeta) {
  return {
    id: row.id,
    namespace: row.namespace,
    ref_id: row.refId,
    dims: row.dims,
    metadata: row.metadata,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function publicHit(hit: VectorSearchHit) {
  return {
    id: hit.id,
    ref_id: hit.refId,
    score: hit.score,
    metadata: hit.metadata,
    dims: hit.dims,
  };
}

export function registerVectorRoutes(
  protectedRoutes: Hono<{ Variables: JordAuthVariables }>,
  deps: VectorRouteDeps,
): void {
  protectedRoutes.get("/vectors/namespaces", async (c) => {
    const namespaces = await deps.jord.listVectorNamespaces();
    return c.json({ namespaces });
  });

  protectedRoutes.get("/vectors/:namespace", async (c) => {
    const namespace = c.req.param("namespace");
    if (!isValidVectorNamespace(namespace)) {
      throw new HTTPException(400, { message: "invalid namespace" });
    }
    const rows = await deps.jord.listEmbeddings(namespace);
    return c.json({
      namespace,
      embeddings: rows.map(publicMeta),
    });
  });

  protectedRoutes.post("/vectors/:namespace/search", async (c) => {
    const namespace = c.req.param("namespace");
    if (!isValidVectorNamespace(namespace)) {
      throw new HTTPException(400, { message: "invalid namespace" });
    }
    const body = (await c.req.json().catch(() => null)) as {
      embedding?: unknown;
      limit?: unknown;
    } | null;
    if (!body) {
      throw new HTTPException(400, { message: "JSON body required" });
    }
    const limit =
      typeof body.limit === "number" ? body.limit : undefined;
    const result = await deps.jord.searchVectors({
      namespace,
      embedding: body.embedding as number[],
      limit,
    });
    if (!result.ok) {
      const status = result.error === "dims_mismatch" ? 409 : 400;
      throw new HTTPException(status, { message: result.message });
    }
    return c.json({ namespace, hits: result.hits.map(publicHit) });
  });

  protectedRoutes.put(
    "/vectors/:namespace/:id",
    requireWriteVectors(),
    async (c) => {
      const namespace = c.req.param("namespace");
      const id = c.req.param("id");
      if (!isValidVectorNamespace(namespace) || !id) {
        throw new HTTPException(400, { message: "invalid namespace or id" });
      }
      const body = (await c.req.json().catch(() => null)) as {
        embedding?: unknown;
        ref_id?: unknown;
        metadata?: unknown;
      } | null;
      if (!body) {
        throw new HTTPException(400, { message: "JSON body required" });
      }
      const result = await deps.enqueueWrite(() =>
        deps.jord.upsertEmbedding({
          id,
          namespace,
          embedding: body.embedding as number[],
          refId:
            body.ref_id === undefined
              ? undefined
              : body.ref_id === null
                ? null
                : String(body.ref_id),
          metadata:
            body.metadata === undefined
              ? undefined
              : body.metadata === null
                ? null
                : String(body.metadata),
        }),
      );
      if (!result.ok) {
        const status =
          result.error === "dims_mismatch" ? 409 : 400;
        throw new HTTPException(status, { message: result.message });
      }
      return c.json(publicMeta(result.row));
    },
  );

  protectedRoutes.delete(
    "/vectors/:namespace/:id",
    requireWriteVectors(),
    async (c) => {
      const namespace = c.req.param("namespace");
      const id = c.req.param("id");
      if (!isValidVectorNamespace(namespace) || !id) {
        throw new HTTPException(400, { message: "invalid namespace or id" });
      }
      const deleted = await deps.enqueueWrite(() =>
        deps.jord.deleteEmbedding(namespace, id),
      );
      if (!deleted) {
        throw new HTTPException(404, { message: "embedding not found" });
      }
      return c.json({ ok: true as const, namespace, id });
    },
  );
}
