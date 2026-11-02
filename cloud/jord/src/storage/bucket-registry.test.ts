import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import {
  openTestDb,
  TEST_BACKENDS,
  type TestBackend,
  type TestDb,
} from "../testing/harness.js";
import {
  assertBucketUploadLimits,
  clampSignTtlSeconds,
  createBucketResolver,
  createLocalStorageAdapter,
  getBucketRow,
  materializeBucketRow,
  MAX_SIGN_TTL_SECONDS,
  type JordStoragePort,
  type PresignRequest,
  type PresignResult,
} from "./index.js";

const AUTH: JordAuthConfig = {
  secret: "test-bucket-registry-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const headers = {
  Authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
};

const temps: string[] = [];
const dbs: TestDb[] = [];
let backend: TestBackend = "file";

afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

function memoryS3Port(): JordStoragePort {
  const objects = new Map<
    string,
    { bytes: Uint8Array; contentType: string; etag: string }
  >();
  const keyOf = (bucket: string, key: string) => `${bucket}/${key}`;
  return {
    kind: "s3",
    async ensureBucket() {},
    async putObject(bucket, key, bytes, contentType) {
      const etag = createHash("sha256").update(bytes).digest("hex");
      objects.set(keyOf(bucket, key), {
        bytes: new Uint8Array(bytes),
        contentType,
        etag,
      });
      return { size: bytes.byteLength, etag };
    },
    async getObject(bucket, key) {
      const hit = objects.get(keyOf(bucket, key));
      return hit ? Buffer.from(hit.bytes) : null;
    },
    async headObject(bucket, key) {
      const hit = objects.get(keyOf(bucket, key));
      if (!hit) return null;
      return {
        size: hit.bytes.byteLength,
        etag: hit.etag,
        contentType: hit.contentType,
      };
    },
    async deleteObject(bucket, key) {
      const id = keyOf(bucket, key);
      if (!objects.has(id)) return false;
      objects.delete(id);
      return true;
    },
    async presign(request: PresignRequest): Promise<PresignResult> {
      return {
        url: `memory://s3/${request.bucket}/${request.key}`,
        method: request.intent === "upload" ? "PUT" : "GET",
        headers: {},
        expiresAt: Date.now() + request.expiresInSeconds * 1000,
      };
    },
  };
}

describe.each(TEST_BACKENDS)("S0066 bucket registry (%s)", (name) => {
  beforeEach(() => {
    backend = name;
  });

  it("serves upload/download/delete on two providers in one project", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-buckets-"));
    temps.push(dir);
    const db = await openTestDb(backend);
    dbs.push(db);
    const local = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: AUTH.secret,
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    const remote = memoryS3Port();

    await materializeBucketRow({
      jord: db.jord,
      name: "localdocs",
      provider: "local",
    });
    await materializeBucketRow({
      jord: db.jord,
      name: "cdn",
      provider: "s3",
      physicalBucket: "jord-test",
      region: "auto",
    });

    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage: local,
      blobSigningSecret: AUTH.secret,
      createBucketPort: (row) => {
        if (row.provider === "local") return local;
        return remote;
      },
    });

    const putLocal = await app.request("/blobs/localdocs/objects/a.txt", {
      method: "PUT",
      headers: { ...headers, "content-type": "text/plain" },
      body: "hello-local",
    });
    expect(putLocal.status).toBe(200);

    const putRemote = await app.request("/blobs/cdn/objects/b.txt", {
      method: "PUT",
      headers: { ...headers, "content-type": "text/plain" },
      body: "hello-s3",
    });
    expect(putRemote.status).toBe(200);

    const getLocal = await app.request("/blobs/localdocs/objects/a.txt", {
      headers,
    });
    expect(getLocal.status).toBe(200);
    expect(await getLocal.text()).toBe("hello-local");

    const getRemote = await app.request("/blobs/cdn/objects/b.txt", {
      headers,
    });
    expect(getRemote.status).toBe(200);
    expect(await getRemote.text()).toBe("hello-s3");

    const delLocal = await app.request("/blobs/localdocs/objects/a.txt", {
      method: "DELETE",
      headers,
    });
    expect(delLocal.status).toBe(200);
    const delRemote = await app.request("/blobs/cdn/objects/b.txt", {
      method: "DELETE",
      headers,
    });
    expect(delRemote.status).toBe(200);
  });

  it("falls back to the env backend when no jord_buckets row exists", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-buckets-env-"));
    temps.push(dir);
    const db = await openTestDb(backend);
    dbs.push(db);
    const local = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: AUTH.secret,
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    const resolver = createBucketResolver({
      jord: db.jord,
      envPort: local,
      factory: {
        blobsRoot: path.join(dir, "blobs"),
        hmacSecret: AUTH.secret,
        publicBaseUrl: "http://127.0.0.1:8787",
      },
    });
    const resolved = await resolver.resolveBucket("orphan");
    expect(resolved.source).toBe("env");
    expect(resolved.row).toBeNull();
    expect(resolved.port).toBe(local);

    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage: local,
      blobSigningSecret: AUTH.secret,
    });
    const put = await app.request("/blobs/orphan/objects/note.txt", {
      method: "PUT",
      headers: { ...headers, "content-type": "text/plain" },
      body: "env-only",
    });
    expect(put.status).toBe(200);
    expect(await getBucketRow(db.jord, "orphan")).toBeNull();
  });

  it("enforces size/MIME/TTL from the bucket row and reuses the port cache", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-buckets-lim-"));
    temps.push(dir);
    const db = await openTestDb(backend);
    dbs.push(db);
    const local = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: AUTH.secret,
      publicBaseUrl: "http://127.0.0.1:8787",
    });

    await materializeBucketRow({
      jord: db.jord,
      name: "tight",
      provider: "local",
      maxObjectBytes: 8,
      allowedMimeTypes: ["text/plain"],
      signTtlSeconds: 30,
    });

    const resolver = createBucketResolver({
      jord: db.jord,
      envPort: local,
      factory: {
        blobsRoot: path.join(dir, "blobs"),
        hmacSecret: AUTH.secret,
        publicBaseUrl: "http://127.0.0.1:8787",
      },
      createPort: () => local,
    });
    const a = await resolver.resolveBucket("tight");
    const b = await resolver.resolveBucket("tight");
    expect(a.port).toBe(b.port);
    expect(resolver.portCacheSize()).toBe(1);

    expect(clampSignTtlSeconds(120, a.limits.signTtlSeconds)).toBe(30);
    expect(clampSignTtlSeconds(10, a.limits.signTtlSeconds)).toBe(10);
    expect(clampSignTtlSeconds(undefined, a.limits.signTtlSeconds)).toBe(30);
    expect(clampSignTtlSeconds(MAX_SIGN_TTL_SECONDS + 10, null)).toBe(
      MAX_SIGN_TTL_SECONDS,
    );

    expect(
      assertBucketUploadLimits({
        size: 9,
        contentType: "text/plain",
        maxObjectBytes: a.limits.maxObjectBytes,
        allowedMimeTypes: a.limits.allowedMimeTypes,
      }).ok,
    ).toBe(false);
    expect(
      assertBucketUploadLimits({
        size: 4,
        contentType: "image/png",
        maxObjectBytes: a.limits.maxObjectBytes,
        allowedMimeTypes: a.limits.allowedMimeTypes,
      }),
    ).toMatchObject({ ok: false, status: 415 });

    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage: local,
      blobSigningSecret: AUTH.secret,
      createBucketPort: () => local,
    });

    const tooBig = await app.request("/blobs/tight/objects/big.txt", {
      method: "PUT",
      headers: { ...headers, "content-type": "text/plain" },
      body: "123456789",
    });
    expect(tooBig.status).toBe(413);

    const badMime = await app.request("/blobs/tight/objects/pic.png", {
      method: "PUT",
      headers: { ...headers, "content-type": "image/png" },
      body: "1234",
    });
    expect(badMime.status).toBe(415);

    const ok = await app.request("/blobs/tight/objects/ok.txt", {
      method: "PUT",
      headers: { ...headers, "content-type": "text/plain" },
      body: "ok-bytes",
    });
    expect(ok.status).toBe(200);

    const sign = await app.request("/blobs/tight/objects/ok.txt/sign", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ intent: "download", ttl_seconds: 600 }),
    });
    expect(sign.status).toBe(200);
    const signed = (await sign.json()) as { expires_at: number };
    const remainingSec = Math.round((signed.expires_at - Date.now()) / 1000);
    expect(remainingSec).toBeLessThanOrEqual(30);
    expect(remainingSec).toBeGreaterThan(0);
  });

  it("materializes an env-default row on POST /blobs/buckets", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-buckets-mat-"));
    temps.push(dir);
    const db = await openTestDb(backend);
    dbs.push(db);
    const local = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: AUTH.secret,
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage: local,
      blobSigningSecret: AUTH.secret,
    });
    const res = await app.request("/blobs/buckets", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ name: "fresh" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { provider: string; name: string };
    expect(body.name).toBe("fresh");
    expect(body.provider).toBe("local");
    const row = await getBucketRow(db.jord, "fresh");
    expect(row?.provider).toBe("local");
  });
});
