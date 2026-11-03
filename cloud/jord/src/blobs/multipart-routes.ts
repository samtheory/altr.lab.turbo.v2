import {
  isValidBlobBucket,
  isValidBlobKey,
  normalizeContentType,
  type JordBlob,
} from "@altr/jord";
import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import type { JordAuthVariables } from "../auth/index.js";
import { requireWriteBlobs } from "../auth/middleware.js";
import {
  assertBucketUploadLimits,
  assertSignAllowed,
  clampSignTtlSeconds,
  type ResolvedBucket,
} from "../storage/index.js";
import {
  MAX_OPEN_UPLOADS_PER_PRINCIPAL,
  MAX_PARTS,
  MAX_SIGN_BATCH,
  countOpenUploads,
  deleteUpload,
  getUpload,
  insertUpload,
  isUploadId,
  newUploadId,
  planParts,
  principalSubject,
  resolveMultipartLimits,
  touchUpload,
  transitionUpload,
  validPartNumber,
  verifyParts,
  expectedPartSize,
  type UploadRow,
} from "../storage/multipart.js";
import {
  createTransformService,
  DERIVATIVE_RESERVED_MESSAGE,
  isDerivativeRow,
} from "../storage/transform.js";
import type { BlobRouteDeps } from "./routes.js";

function publicUpload(row: UploadRow) {
  return {
    upload_id: row.id,
    bucket: row.bucket,
    key: row.objectKey,
    content_type: row.contentType,
    size: row.totalSize,
    part_size: row.partSize,
    parts_expected: row.partsExpected,
    status: row.status,
    expires_at: row.expiresAt,
  };
}

function subjectOf(
  principal: import("../auth/principal.js").Principal,
): string {
  const subject = principalSubject(principal);
  if (!subject) {
    throw new HTTPException(403, {
      message: "multipart uploads require an identified principal",
    });
  }
  return subject;
}

function assertActive(resolved: ResolvedBucket): void {
  if (resolved.row?.status === "paused") {
    throw new HTTPException(503, {
      message: `bucket "${resolved.name}" is paused`,
    });
  }
}

/**
 * S0081 session endpoints. Mounted from `registerBlobRoutes`.
 *
 *   POST   /blobs/:bucket/uploads                      create
 *   GET    /blobs/:bucket/uploads/:id                  resume status
 *   POST   /blobs/:bucket/uploads/:id/parts/sign       batch part URLs
 *   POST   /blobs/:bucket/uploads/:id/complete         verify + finalize
 *   DELETE /blobs/:bucket/uploads/:id                  abort
 */
export function registerMultipartRoutes(
  routes: Hono<{ Variables: JordAuthVariables }>,
  deps: Pick<
    BlobRouteDeps,
    "jord" | "enqueueWrite" | "resolveBucket" | "env"
  >,
  publicBlob: (row: JordBlob) => Record<string, unknown>,
): void {
  const env = deps.env ?? process.env;
  const limits = resolveMultipartLimits(env);

  /** Load a session bound to this bucket + principal; 404 otherwise (no oracle). */
  async function loadSession(
    bucket: string,
    id: string,
    principal: string,
  ): Promise<UploadRow> {
    if (!isValidBlobBucket(bucket)) {
      throw new HTTPException(400, { message: "invalid bucket name" });
    }
    if (!isUploadId(id)) {
      throw new HTTPException(404, { message: "upload not found" });
    }
    const row = await getUpload(deps.jord, id);
    if (
      !row ||
      row.bucket !== bucket ||
      row.principal !== principal ||
      row.expiresAt <= Date.now()
    ) {
      throw new HTTPException(404, { message: "upload not found" });
    }
    return row;
  }

  async function gateWrite(
    c: { get: (k: "principal") => import("../auth/principal.js").Principal },
    bucket: string,
  ) {
    const gate = await assertSignAllowed({
      jord: deps.jord,
      principal: c.get("principal"),
      bucket,
      intent: "upload",
      env,
    });
    if (!gate.allowed) {
      throw new HTTPException(gate.status, { message: gate.reason });
    }
  }

  routes.post("/blobs/:bucket/uploads", requireWriteBlobs(), async (c) => {
    const bucket = c.req.param("bucket");
    if (!isValidBlobBucket(bucket)) {
      throw new HTTPException(400, { message: "invalid bucket name" });
    }
    const body = (await c.req.json().catch(() => null)) as {
      key?: unknown;
      content_type?: unknown;
      size?: unknown;
      part_size?: unknown;
    } | null;
    const key = typeof body?.key === "string" ? body.key : "";
    if (!isValidBlobKey(key)) {
      throw new HTTPException(400, { message: "invalid object key" });
    }
    const contentType = normalizeContentType(
      typeof body?.content_type === "string" ? body.content_type : undefined,
    );

    const resolved = await deps.resolveBucket(bucket);
    assertActive(resolved);
    await gateWrite(c, bucket);
    if (await isDerivativeRow(deps.jord, bucket, key)) {
      throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
    }

    const plan = planParts({
      totalSize: body?.size,
      partSize: body?.part_size,
      minPartBytes: limits.minPartBytes,
    });
    if (!plan.ok) throw new HTTPException(plan.status, { message: plan.message });

    const gate = assertBucketUploadLimits({
      size: body!.size as number,
      contentType,
      maxObjectBytes: resolved.limits.maxObjectBytes,
      allowedMimeTypes: resolved.limits.allowedMimeTypes,
    });
    if (!gate.ok) throw new HTTPException(gate.status, { message: gate.message });

    const port = resolved.port;
    if (!port.createMultipartUpload || !port.listMultipartParts) {
      throw new HTTPException(501, {
        message: "multipart not supported by storage backend",
      });
    }

    const principal = subjectOf(c.get("principal"));
    const now = Date.now();

    await port.ensureBucket(bucket);
    const created = await port.createMultipartUpload({
      bucket,
      key,
      contentType,
      totalSize: body!.size as number,
      partSize: plan.partSize,
    });
    const row: UploadRow = {
      id: newUploadId(),
      bucket,
      objectKey: key,
      principal,
      contentType,
      totalSize: body!.size as number,
      partSize: plan.partSize,
      partsExpected: plan.partsExpected,
      providerUploadId: created.uploadId,
      storageKind: port.kind,
      status: "open",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + limits.uploadTtlMs,
    };
    try {
      // Insert then count: the cap holds even under concurrent creates.
      const over = await deps.enqueueWrite(async () => {
        await insertUpload(deps.jord, row);
        if (
          (await countOpenUploads(deps.jord, principal, now)) >
          MAX_OPEN_UPLOADS_PER_PRINCIPAL
        ) {
          await deleteUpload(deps.jord, row.id);
          return true;
        }
        return false;
      });
      if (over) {
        await port
          .abortMultipartUpload?.({ bucket, key, uploadId: created.uploadId })
          .catch(() => undefined);
        throw new HTTPException(429, { message: "too many open uploads" });
      }
    } catch (err) {
      await port
        .abortMultipartUpload?.({
          bucket,
          key,
          uploadId: created.uploadId,
        })
        .catch(() => undefined);
      throw err;
    }
    return c.json({ ...publicUpload(row), storage: port.kind }, 201);
  });

  routes.get("/blobs/:bucket/uploads/:id", requireWriteBlobs(), async (c) => {
    const row = await loadSession(
      c.req.param("bucket"),
      c.req.param("id"),
      subjectOf(c.get("principal")),
    );
    const resolved = await deps.resolveBucket(row.bucket);
    let parts: Array<{ part_number: number; size: number; etag: string }> = [];
    if (row.status !== "done" && resolved.port.listMultipartParts) {
      const stored = await resolved.port.listMultipartParts({
        bucket: row.bucket,
        key: row.objectKey,
        uploadId: row.providerUploadId,
      });
      parts = stored
        .filter((p) => p.partNumber >= 1 && p.partNumber <= row.partsExpected)
        .map((p) => ({ part_number: p.partNumber, size: p.size, etag: p.etag }));
    }
    const have = new Set(parts.map((p) => p.part_number));
    const missing: number[] = [];
    for (let n = 1; n <= row.partsExpected; n += 1) {
      if (!have.has(n)) missing.push(n);
    }
    return c.json({
      ...publicUpload(row),
      parts,
      received_bytes: parts.reduce((sum, p) => sum + p.size, 0),
      missing_parts: row.status === "done" ? [] : missing,
    });
  });

  routes.post(
    "/blobs/:bucket/uploads/:id/parts/sign",
    requireWriteBlobs(),
    async (c) => {
      const bucket = c.req.param("bucket");
      const row = await loadSession(
        bucket,
        c.req.param("id"),
        subjectOf(c.get("principal")),
      );
      if (row.status !== "open") {
        throw new HTTPException(409, { message: `upload is ${row.status}` });
      }
      const body = (await c.req.json().catch(() => null)) as {
        parts?: unknown;
        ttl_seconds?: unknown;
      } | null;
      const requested = body?.parts;
      if (
        !Array.isArray(requested) ||
        requested.length === 0 ||
        requested.length > MAX_SIGN_BATCH
      ) {
        throw new HTTPException(400, {
          message: `parts must be a list of 1..${MAX_SIGN_BATCH} part numbers`,
        });
      }
      const numbers = [...new Set(requested as unknown[])];
      for (const n of numbers) {
        if (!validPartNumber(row, n)) {
          throw new HTTPException(400, {
            message: `part numbers must be integers in 1..${Math.min(row.partsExpected, MAX_PARTS)}`,
          });
        }
      }

      const resolved = await deps.resolveBucket(bucket);
      assertActive(resolved);
      await gateWrite(c, bucket);
      const ttl = clampSignTtlSeconds(
        body?.ttl_seconds,
        resolved.limits.signTtlSeconds,
      );
      const signed = [];
      for (const n of numbers as number[]) {
        const s = await resolved.port.presign({
          bucket: row.bucket,
          key: row.objectKey,
          intent: "upload",
          contentType: row.contentType,
          expiresInSeconds: ttl,
          uploadId: row.providerUploadId,
          partNumber: n,
          partBytes: expectedPartSize(row, n),
        });
        signed.push({
          part_number: n,
          url: s.url,
          method: s.method,
          headers: s.headers,
          expires_at: s.expiresAt,
          size: expectedPartSize(row, n),
        });
      }
      // Sliding expiry: an actively used session is not swept mid-upload.
      const now = Date.now();
      await deps.enqueueWrite(() =>
        touchUpload(deps.jord, row.id, now + limits.uploadTtlMs, now),
      );
      return c.json({ upload_id: row.id, parts: signed, storage: resolved.port.kind });
    },
  );

  routes.post(
    "/blobs/:bucket/uploads/:id/complete",
    requireWriteBlobs(),
    async (c) => {
      const bucket = c.req.param("bucket");
      const row = await loadSession(
        bucket,
        c.req.param("id"),
        subjectOf(c.get("principal")),
      );
      const resolved = await deps.resolveBucket(bucket);
      assertActive(resolved);

      if (row.status === "done") {
        const meta = await deps.jord.getBlobMeta(row.bucket, row.objectKey);
        if (meta && meta.status === "ready") {
          return c.json({ ...publicBlob(meta), upload_id: row.id });
        }
        throw new HTTPException(409, { message: "upload already completed" });
      }

      const body = (await c.req.json().catch(() => ({}))) as {
        parts?: unknown;
      } | null;
      let claimed: Array<{ partNumber: number; etag: string }> | undefined;
      if (body?.parts !== undefined) {
        if (!Array.isArray(body.parts) || body.parts.length > MAX_PARTS) {
          throw new HTTPException(400, { message: "invalid parts list" });
        }
        claimed = [];
        for (const p of body.parts as Array<Record<string, unknown>>) {
          if (
            !p ||
            !Number.isInteger(p.part_number) ||
            typeof p.etag !== "string" ||
            p.etag.length === 0 ||
            p.etag.length > 256
          ) {
            throw new HTTPException(400, {
              message: "each part needs part_number and etag",
            });
          }
          claimed.push({ partNumber: p.part_number as number, etag: p.etag });
        }
      }

      const port = resolved.port;
      if (
        !port.completeMultipartUpload ||
        !port.listMultipartParts ||
        !port.abortMultipartUpload
      ) {
        throw new HTTPException(501, {
          message: "multipart not supported by storage backend",
        });
      }

      await gateWrite(c, bucket);

      const abortSession = async () => {
        await port
          .abortMultipartUpload!({
            bucket: row.bucket,
            key: row.objectKey,
            uploadId: row.providerUploadId,
          })
          .catch(() => undefined);
        await deps.enqueueWrite(() => deleteUpload(deps.jord, row.id));
      };

      // Bucket limits are re-checked at complete (they may have tightened).
      const limitGate = assertBucketUploadLimits({
        size: row.totalSize,
        contentType: row.contentType,
        maxObjectBytes: resolved.limits.maxObjectBytes,
        allowedMimeTypes: resolved.limits.allowedMimeTypes,
      });
      if (!limitGate.ok) {
        await abortSession();
        throw new HTTPException(limitGate.status, { message: limitGate.message });
      }

      const won = await deps.enqueueWrite(() =>
        transitionUpload(deps.jord, row.id, "open", "completing", Date.now()),
      );
      if (!won) {
        throw new HTTPException(409, { message: "upload is not open" });
      }
      const reopen = () =>
        deps
          .enqueueWrite(() =>
            transitionUpload(deps.jord, row.id, "completing", "open", Date.now()),
          )
          .catch(() => undefined);

      try {
        const stored = await port.listMultipartParts({
          bucket: row.bucket,
          key: row.objectKey,
          uploadId: row.providerUploadId,
        });
        const check = verifyParts(row, stored, claimed);
        if (!check.ok) {
          await reopen();
          if (check.missing) {
            return c.json(
              {
                error: "incomplete_upload",
                message: check.message,
                missing_parts: check.missing,
              },
              409,
            );
          }
          throw new HTTPException(400, { message: check.message });
        }

        // A derivative may have claimed the key since create: never assemble over it.
        if (await isDerivativeRow(deps.jord, row.bucket, row.objectKey)) {
          await reopen();
          throw new HTTPException(409, { message: DERIVATIVE_RESERVED_MESSAGE });
        }
        const written = await port.completeMultipartUpload({
          bucket: row.bucket,
          key: row.objectKey,
          uploadId: row.providerUploadId,
          parts: check.parts.map((p) => ({
            partNumber: p.partNumber,
            etag: p.etag,
          })),
        });
        const head = await port.headObject(row.bucket, row.objectKey);
        const size = head?.size ?? written.size;
        if (size !== row.totalSize) {
          await port.deleteObject(row.bucket, row.objectKey).catch(() => false);
          await deps.enqueueWrite(() => deleteUpload(deps.jord, row.id));
          throw new HTTPException(422, {
            message: `assembled object is ${size} bytes; declared ${row.totalSize}`,
          });
        }
        const meta = await deps.enqueueWrite(async () => {
          const saved = await deps.jord.upsertBlobMeta({
            bucket: row.bucket,
            key: row.objectKey,
            contentType: row.contentType,
            size,
            etag: written.etag,
            status: "ready",
            pendingExpiresAt: null,
            uploadId: null,
          });
          await transitionUpload(
            deps.jord,
            row.id,
            "completing",
            "done",
            Date.now(),
          );
          return saved;
        });
        // Overwrite invalidates derivatives rendered from the previous bytes.
        await createTransformService({
          jord: deps.jord,
          enqueueWrite: deps.enqueueWrite,
        })
          .deleteDerivatives({
            bucket: row.bucket,
            key: row.objectKey,
            port,
            keepEtag: meta.etag,
          })
          .catch((err) =>
            console.error(
              `[@altr/jord-server] stale derivative cleanup failed ${row.bucket}/${row.objectKey}`,
              err,
            ),
          );
        return c.json({ ...publicBlob(meta), upload_id: row.id });
      } catch (err) {
        if (err instanceof HTTPException) throw err;
        console.error(
          `[@altr/jord-server] multipart complete failed ${row.bucket}/${row.objectKey}`,
          err,
        );
        await reopen();
        throw new HTTPException(502, { message: "storage_error" });
      }
    },
  );

  routes.delete("/blobs/:bucket/uploads/:id", requireWriteBlobs(), async (c) => {
    const row = await loadSession(
      c.req.param("bucket"),
      c.req.param("id"),
      subjectOf(c.get("principal")),
    );
    // Gate on open -> aborting so abort cannot race complete (open -> completing).
    const won = await deps.enqueueWrite(() =>
      transitionUpload(deps.jord, row.id, "open", "aborting", Date.now()),
    );
    if (!won) {
      throw new HTTPException(409, { message: "upload is not open" });
    }
    try {
      const resolved = await deps.resolveBucket(row.bucket);
      await resolved.port.abortMultipartUpload?.({
        bucket: row.bucket,
        key: row.objectKey,
        uploadId: row.providerUploadId,
      });
    } catch (err) {
      console.error(
        `[@altr/jord-server] multipart abort failed ${row.bucket}/${row.objectKey}`,
        err,
      );
      await deps
        .enqueueWrite(() =>
          transitionUpload(deps.jord, row.id, "aborting", "open", Date.now()),
        )
        .catch(() => undefined);
      return c.json({ error: "storage_abort_failed" as const }, 502);
    }
    await deps.enqueueWrite(() => deleteUpload(deps.jord, row.id));
    return c.json({ ok: true as const, upload_id: row.id });
  });
}
