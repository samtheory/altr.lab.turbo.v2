import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { materializeBucketRow } from "./bucket-registry.js";
import { createLocalStorageAdapter } from "./local.js";
import {
  gcExpiredUploads,
  newUploadId,
  planParts,
  verifyParts,
  type UploadRow,
} from "./multipart.js";
import { createS3StorageAdapter } from "./s3.js";

const AUTH: JordAuthConfig = {
  secret: "test-multipart-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const ENV = { JORD_MULTIPART_MIN_PART_BYTES: "4" } as NodeJS.ProcessEnv;

const temps: string[] = [];
const dbs: TestDb[] = [];

afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

const json = { "content-type": "application/json" };
const auth = (role: "admin" | "editor" = "admin") => ({
  Authorization: `Bearer ${signSessionToken(role, AUTH.secret)}`,
  ...json,
});

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-mp-"));
  temps.push(dir);
  const db = await openTestDb("file");
  dbs.push(db);
  const root = path.join(dir, "blobs");
  const mkApp = () => {
    const storage = createLocalStorageAdapter({
      root,
      hmacSecret: AUTH.secret,
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    const app = createJordApp({
      jord: db.jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      storage,
      blobsRoot: root,
      blobSigningSecret: AUTH.secret,
      env: ENV,
      createBucketPort: () => storage,
    });
    return { app, storage };
  };
  return { ...mkApp(), mkApp, db, root };
}

type Ctx = Awaited<ReturnType<typeof setup>>;

async function create(
  ctx: Ctx,
  body: Record<string, unknown>,
  headers = auth(),
  bucket = "lab",
) {
  return ctx.app.request(`/blobs/${bucket}/uploads`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function signParts(ctx: Ctx, id: string, parts: number[], bucket = "lab") {
  const res = await ctx.app.request(`/blobs/${bucket}/uploads/${id}/parts/sign`, {
    method: "POST",
    headers: auth(),
    body: JSON.stringify({ parts }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as {
    parts: Array<{ part_number: number; url: string; method: string }>;
  };
}

async function putPart(ctx: Ctx, url: string, bytes: Uint8Array) {
  const u = new URL(url);
  return ctx.app.request(u.pathname + u.search, { method: "PUT", body: bytes as BodyInit });
}

const bytesOf = (s: string) => new TextEncoder().encode(s);

describe("multipart: local resume", () => {
  it("resumes after a disconnect and a server restart, then completes", async () => {
    const ctx = await setup();
    const payload = "0123456789abcdefghij"; // 20 bytes -> 8 + 8 + 4
    const res = await create(ctx, {
      key: "big/data.bin",
      content_type: "application/octet-stream",
      size: 20,
      part_size: 8,
    });
    expect(res.status).toBe(201);
    const session = (await res.json()) as {
      upload_id: string;
      parts_expected: number;
      part_size: number;
    };
    expect(session.parts_expected).toBe(3);
    expect(session.upload_id).toMatch(/^[0-9a-f]{64}$/);

    const signed = await signParts(ctx, session.upload_id, [1, 2, 3]);
    expect(signed.parts).toHaveLength(3);
    expect((await putPart(ctx, signed.parts[0]!.url, bytesOf(payload.slice(0, 8)))).status).toBe(200);
    expect((await putPart(ctx, signed.parts[2]!.url, bytesOf(payload.slice(16)))).status).toBe(200);

    // "Disconnect": a brand-new app over the same disk + DB (server restart).
    const next = ctx.mkApp();
    const status = await next.app.request(`/blobs/lab/uploads/${session.upload_id}`, {
      headers: auth(),
    });
    expect(status.status).toBe(200);
    const st = (await status.json()) as {
      parts: Array<{ part_number: number }>;
      received_bytes: number;
      missing_parts: number[];
    };
    expect(st.parts.map((p) => p.part_number)).toEqual([1, 3]);
    expect(st.received_bytes).toBe(12);
    expect(st.missing_parts).toEqual([2]);

    // Completing early is refused and the session stays resumable.
    const early = await next.app.request(`/blobs/lab/uploads/${session.upload_id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(early.status).toBe(409);
    expect(((await early.json()) as { missing_parts: number[] }).missing_parts).toEqual([2]);

    const resigned = await next.app.request(
      `/blobs/lab/uploads/${session.upload_id}/parts/sign`,
      { method: "POST", headers: auth(), body: JSON.stringify({ parts: [2] }) },
    );
    const part2 = ((await resigned.json()) as { parts: Array<{ url: string }> }).parts[0]!;
    const u = new URL(part2.url);
    expect(
      (await next.app.request(u.pathname + u.search, { method: "PUT", body: bytesOf(payload.slice(8, 16)) }))
        .status,
    ).toBe(200);

    const done = await next.app.request(`/blobs/lab/uploads/${session.upload_id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(done.status).toBe(200);
    const meta = (await done.json()) as { status: string; size: number; key: string };
    expect(meta).toMatchObject({ status: "ready", size: 20, key: "big/data.bin" });

    const get = await next.app.request("/blobs/lab/objects/big%2Fdata.bin", { headers: auth() });
    expect(Buffer.from(await get.arrayBuffer()).toString()).toBe(payload);

    // Temp parts are gone; completing again is idempotent.
    expect(await readdir(path.join(ctx.root, ".multipart"))).toEqual([]);
    const again = await next.app.request(`/blobs/lab/uploads/${session.upload_id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(again.status).toBe(200);
  });

  it("verifies client-sent etags", async () => {
    const ctx = await setup();
    const id = ((await (await create(ctx, { key: "a.bin", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    const signed = await signParts(ctx, id, [1, 2]);
    const r1 = (await (await putPart(ctx, signed.parts[0]!.url, bytesOf("aaaa"))).json()) as {
      etag: string;
    };
    const r2 = (await (await putPart(ctx, signed.parts[1]!.url, bytesOf("bbbb"))).json()) as {
      etag: string;
    };
    const bad = await ctx.app.request(`/blobs/lab/uploads/${id}/complete`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        parts: [
          { part_number: 1, etag: r1.etag },
          { part_number: 2, etag: "0".repeat(64) },
        ],
      }),
    });
    expect(bad.status).toBe(400);
    const ok = await ctx.app.request(`/blobs/lab/uploads/${id}/complete`, {
      method: "POST",
      headers: auth(),
      body: JSON.stringify({
        parts: [
          { part_number: 1, etag: r1.etag },
          { part_number: 2, etag: r2.etag },
        ],
      }),
    });
    expect(ok.status).toBe(200);
  });

  it("rejects a wrong-sized part at complete", async () => {
    const ctx = await setup();
    const id = ((await (await create(ctx, { key: "w.bin", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    const signed = await signParts(ctx, id, [1, 2]);
    // the oversize PUT is refused at write time, so the part never lands
    expect((await putPart(ctx, signed.parts[0]!.url, bytesOf("aaaaa"))).status).toBe(413);
    await putPart(ctx, signed.parts[1]!.url, bytesOf("bbbb"));
    const res = await ctx.app.request(`/blobs/lab/uploads/${id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(res.status).toBe(409);
    expect(await ctx.db.jord.getBlobMeta("lab", "w.bin")).toBeNull();
  });

  it("streams a large assembly without buffering parts (64 MiB)", async () => {
    const ctx = await setup();
    await materializeBucketRow({
      jord: ctx.db.jord,
      name: "large",
      provider: "local",
      maxObjectBytes: 128 * 1024 * 1024,
    });
    const part = 16 * 1024 * 1024;
    const id = ((await (
      await create(ctx, { key: "large.bin", size: part * 4, part_size: part }, auth(), "large")
    ).json()) as { upload_id: string }).upload_id;
    const signed = await signParts(ctx, id, [1, 2, 3, 4], "large");
    const chunk = new Uint8Array(part).fill(7);
    for (const p of signed.parts) {
      expect((await putPart(ctx, p.url, chunk)).status).toBe(200);
    }
    const done = await ctx.app.request(`/blobs/large/uploads/${id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(done.status).toBe(200);
    const onDisk = await stat(path.join(ctx.root, "large", "large.bin"));
    expect(onDisk.size).toBe(part * 4);
  }, 60_000);
});

describe("multipart: validation and security", () => {
  it("bounds sizes, parts, keys and part numbers", async () => {
    const ctx = await setup();
    expect((await create(ctx, { key: "../x", size: 8, part_size: 4 })).status).toBe(400);
    expect((await create(ctx, { key: "/abs", size: 8, part_size: 4 })).status).toBe(400);
    expect((await create(ctx, { key: "a", size: 0 })).status).toBe(400);
    expect((await create(ctx, { key: "a", size: -5 })).status).toBe(400);
    expect((await create(ctx, { key: "a", size: 8, part_size: 2 })).status).toBe(400);
    expect((await create(ctx, { key: "a", size: 8, part_size: 1e12 })).status).toBe(400);
    // 10 001 parts
    expect((await create(ctx, { key: "a", size: 40_004, part_size: 4 })).status).toBe(400);
    // over the env max blob size (10 MiB default)
    expect((await create(ctx, { key: "a", size: 11 * 1024 * 1024, part_size: 1024 * 1024 })).status).toBe(413);

    const id = ((await (await create(ctx, { key: "ok", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    for (const parts of [[0], [3], [1.5], ["1"], [], Array.from({ length: 101 }, (_, i) => (i % 2) + 1)]) {
      const res = await ctx.app.request(`/blobs/lab/uploads/${id}/parts/sign`, {
        method: "POST",
        headers: auth(),
        body: JSON.stringify({ parts }),
      });
      expect(res.status).toBe(400);
    }
  });

  it("binds a session to its principal and bucket; ids are not guessable", async () => {
    const ctx = await setup();
    const id = ((await (await create(ctx, { key: "p", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    const other = auth("editor");
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${id}`, { headers: other })).status,
    ).toBe(404);
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${id}`, { method: "DELETE", headers: other })).status,
    ).toBe(404);
    // wrong bucket
    expect(
      (await ctx.app.request(`/blobs/elsewhere/uploads/${id}`, { headers: auth() })).status,
    ).toBe(404);
    // malformed / traversal ids
    for (const bad of ["short", "..%2F..%2Fetc", "G".repeat(64)]) {
      expect(
        (await ctx.app.request(`/blobs/lab/uploads/${bad}`, { headers: auth() })).status,
      ).toBe(404);
    }
    expect(newUploadId()).not.toBe(newUploadId());
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${id}`, { headers: { ...json } })).status,
    ).toBe(401);
  });

  it("enforces per-bucket MIME and size policy at create and complete", async () => {
    const ctx = await setup();
    await materializeBucketRow({
      jord: ctx.db.jord,
      name: "tight",
      provider: "local",
      maxObjectBytes: 16,
      allowedMimeTypes: ["text/plain"],
    });
    expect(
      (await create(ctx, { key: "a", size: 8, part_size: 4, content_type: "image/png" }, auth(), "tight")).status,
    ).toBe(415);
    expect(
      (await create(ctx, { key: "a", size: 32, part_size: 4, content_type: "text/plain" }, auth(), "tight")).status,
    ).toBe(413);
    const created = await create(
      ctx,
      { key: "a.txt", size: 8, part_size: 4, content_type: "text/plain" },
      auth(),
      "tight",
    );
    expect(created.status).toBe(201);
    const id = ((await created.json()) as { upload_id: string }).upload_id;
    const signed = await signParts(ctx, id, [1, 2], "tight");
    await putPart(ctx, signed.parts[0]!.url, bytesOf("aaaa"));
    await putPart(ctx, signed.parts[1]!.url, bytesOf("bbbb"));

    // Policy tightens mid-upload: complete re-checks and aborts the session.
    await ctx.db.jord.query(
      "UPDATE jord_buckets SET max_object_bytes = 4 WHERE name = 'tight'",
      [],
    );
    const res = await ctx.app.request(`/blobs/tight/uploads/${id}/complete`, {
      method: "POST",
      headers: auth(),
      body: "{}",
    });
    expect(res.status).toBe(413);
    expect(await ctx.db.jord.getBlobMeta("tight", "a.txt")).toBeNull();
  });

  it("abort removes temp parts and invalidates outstanding part URLs", async () => {
    const ctx = await setup();
    const id = ((await (await create(ctx, { key: "ab", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    const signed = await signParts(ctx, id, [1, 2]);
    expect((await putPart(ctx, signed.parts[0]!.url, bytesOf("aaaa"))).status).toBe(200);
    expect((await readdir(path.join(ctx.root, ".multipart"))).length).toBe(1);

    const del = await ctx.app.request(`/blobs/lab/uploads/${id}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(del.status).toBe(200);
    expect(await readdir(path.join(ctx.root, ".multipart"))).toEqual([]);
    expect((await putPart(ctx, signed.parts[1]!.url, bytesOf("bbbb"))).status).toBe(404);
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${id}`, { headers: auth() })).status,
    ).toBe(404);
  });

  it("rejects oversized and invalid local part PUTs", async () => {
    const ctx = await setup();
    const part = ctx.storage as ReturnType<typeof createLocalStorageAdapter>;
    const { uploadId } = await part.createMultipartUpload!({
      bucket: "lab",
      key: "k",
      contentType: "text/plain",
    });
    await expect(part.writeMultipartPart!(uploadId, 0, bytesOf("x"))).rejects.toThrow();
    await expect(part.writeMultipartPart!(uploadId, 1, bytesOf("x"))).rejects.toThrow();
    await expect(part.writeMultipartPart!(uploadId, 10_001, bytesOf("x"))).rejects.toThrow();
    await expect(part.writeMultipartPart!("../../evil", 1, bytesOf("x"))).rejects.toThrow();
    await expect(part.writeMultipartPart!("a".repeat(16), 1, bytesOf("x"))).rejects.toThrow(
      "not found",
    );
    await part.abortMultipartUpload!({ bucket: "lab", key: "k", uploadId });
  });
});

describe("multipart: expired session GC", () => {
  it("sweeps abandoned sessions and their temp parts; keeps live ones", async () => {
    const ctx = await setup();
    const make = async (key: string) =>
      ((await (await create(ctx, { key, size: 8, part_size: 4 })).json()) as {
        upload_id: string;
      }).upload_id;
    const stale = await make("stale");
    const live = await make("live");
    const signed = await signParts(ctx, stale, [1]);
    await putPart(ctx, signed.parts[0]!.url, bytesOf("aaaa"));
    await ctx.db.jord.query("UPDATE jord_uploads SET expires_at = ? WHERE id = ?", [
      Date.now() - 1000,
      stale,
    ]);

    const result = await gcExpiredUploads({
      jord: ctx.db.jord,
      resolveStorage: async () => ctx.storage,
    });
    expect(result).toEqual({ expiredUploads: 1, errors: [] });
    // only the live session's temp dir remains (stale one swept)
    expect(await readdir(path.join(ctx.root, ".multipart"))).toHaveLength(1);
    const liveRow = await ctx.db.jord.query("SELECT provider_upload_id FROM jord_uploads", []);
    expect(liveRow).toHaveLength(1);
    expect(await readdir(path.join(ctx.root, ".multipart"))).toEqual([
      String(liveRow[0]!.provider_upload_id),
    ]);
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${live}`, { headers: auth() })).status,
    ).toBe(200);
    // expired sessions are invisible even before the sweep runs
    expect(
      (await ctx.app.request(`/blobs/lab/uploads/${stale}`, { headers: auth() })).status,
    ).toBe(404);
  });

  it("keeps the row when the store abort fails (retry next sweep)", async () => {
    const ctx = await setup();
    const id = ((await (await create(ctx, { key: "f", size: 8, part_size: 4 })).json()) as {
      upload_id: string;
    }).upload_id;
    await ctx.db.jord.query("UPDATE jord_uploads SET expires_at = 1 WHERE id = ?", [id]);
    const failing = {
      ...ctx.storage,
      abortMultipartUpload: async () => {
        throw new Error("boom");
      },
    };
    const first = await gcExpiredUploads({
      jord: ctx.db.jord,
      resolveStorage: async () => failing,
    });
    expect(first.expiredUploads).toBe(0);
    expect(first.errors).toHaveLength(1);
    const second = await gcExpiredUploads({
      jord: ctx.db.jord,
      resolveStorage: async () => ctx.storage,
    });
    expect(second.expiredUploads).toBe(1);
  });
});

describe("multipart: review fixes", () => {
  async function session(ctx: Ctx, key: string, size = 10, part = 4) {
    return ((await (await create(ctx, { key, size, part_size: part })).json()) as {
      upload_id: string;
    }).upload_id;
  }

  it("enforces exact part size on write (oversize, undersize, chunked)", async () => {
    const ctx = await setup();
    const id = await session(ctx, "sz"); // 4 + 4 + 2
    const signed = await signParts(ctx, id, [1, 3]);
    const [p1, p3] = signed.parts;
    expect((await putPart(ctx, p1!.url, bytesOf("aaaaa"))).status).toBe(413);
    expect((await putPart(ctx, p1!.url, bytesOf("aaa"))).status).toBe(400);
    expect((await putPart(ctx, p3!.url, bytesOf("bbbb"))).status).toBe(413);
    expect((await putPart(ctx, p3!.url, bytesOf("bb"))).status).toBe(200);
    const u = new URL(p1!.url);
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytesOf("aa"));
        c.enqueue(bytesOf("aaaa"));
        c.close();
      },
    });
    const chunked = await ctx.app.request(u.pathname + u.search, {
      method: "PUT",
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(chunked.status).toBe(413);
    const dir = path.join(ctx.root, ".multipart");
    const [d] = await readdir(dir);
    const files = await readdir(path.join(dir, d!));
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
    expect(files).not.toContain("part-1");
    expect((await putPart(ctx, p1!.url, bytesOf("aaaa"))).status).toBe(200);
  });

  it("signs the exact content-length for S3 parts", async () => {
    const real = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      credentials: { accessKeyId: "k", secretAccessKey: "s" },
    });
    const s3 = createS3StorageAdapter({ client: real, physicalBucket: "phys" });
    const url = await s3.presign({
      bucket: "lab",
      key: "o.bin",
      intent: "upload",
      expiresInSeconds: 60,
      uploadId: "UP1",
      partNumber: 1,
      partBytes: 5242880,
    });
    const qs = new URL(url.url).searchParams;
    expect((qs.get("X-Amz-SignedHeaders") ?? "").split(";")).toContain("content-length");
  });

  it("abort is gated: loses to a completing session and returns 409", async () => {
    const ctx = await setup();
    const id = await session(ctx, "race");
    await ctx.db.jord.query("UPDATE jord_uploads SET status = 'completing' WHERE id = ?", [id]);
    const del = await ctx.app.request(`/blobs/lab/uploads/${id}`, {
      method: "DELETE",
      headers: auth(),
    });
    expect(del.status).toBe(409);
    expect(await ctx.db.jord.query("SELECT id FROM jord_uploads WHERE id = ?", [id])).toHaveLength(1);
    expect(await readdir(path.join(ctx.root, ".multipart"))).toHaveLength(1);
  });

  it("gc does not abort a refreshed session; sweeps stuck completing only", async () => {
    const ctx = await setup();
    const fresh = await session(ctx, "fresh");
    const stuck = await session(ctx, "stuck");
    const recent = await session(ctx, "recent");
    const now = Date.now();
    await ctx.db.jord.query("UPDATE jord_uploads SET expires_at = ? WHERE id = ?", [now + 60_000, fresh]);
    await ctx.db.jord.query(
      "UPDATE jord_uploads SET status = 'completing', expires_at = 1, updated_at = ? WHERE id = ?",
      [now - 2 * 60 * 60 * 1000, stuck],
    );
    await ctx.db.jord.query(
      "UPDATE jord_uploads SET status = 'completing', expires_at = 1, updated_at = ? WHERE id = ?",
      [now, recent],
    );
    const { claimExpiredUpload } = await import("./multipart.js");
    expect(await claimExpiredUpload(ctx.db.jord, fresh, now)).toBe(false);
    const result = await gcExpiredUploads({
      jord: ctx.db.jord,
      resolveStorage: async () => ctx.storage,
      nowMs: now,
    });
    expect(result).toEqual({ expiredUploads: 1, errors: [] });
    const left = (await ctx.db.jord.query("SELECT id FROM jord_uploads", [])).map((r) => r.id);
    expect([...left].sort()).toEqual([fresh, recent].sort());
  });

  it("does not leak raw errors from gc", async () => {
    const ctx = await setup();
    const id = await session(ctx, "leak");
    await ctx.db.jord.query("UPDATE jord_uploads SET expires_at = 1 WHERE id = ?", [id]);
    const failing = {
      ...ctx.storage,
      abortMultipartUpload: async () => {
        throw new Error("EACCES /secret/path");
      },
    };
    const r = await gcExpiredUploads({ jord: ctx.db.jord, resolveStorage: async () => failing });
    expect(JSON.stringify(r)).not.toContain("secret");
    expect(r.errors).toEqual([`${id.slice(0, 8)}:storage_error`]);
    const st = await ctx.db.jord.query("SELECT status FROM jord_uploads WHERE id = ?", [id]);
    expect(st[0]!.status).toBe("open");
  });

  it("refuses uid-less non-service principals and caps open sessions", async () => {
    const { principalSubject, MAX_OPEN_UPLOADS_PER_PRINCIPAL } = await import("./multipart.js");
    expect(principalSubject({ kind: "user", role: "editor", claims: {} })).toBeNull();
    expect(principalSubject({ kind: "anon", role: "anon", claims: {} })).toBeNull();
    expect(principalSubject({ kind: "user", uid: "u1", role: "editor", claims: {} })).toBe("user:u1");
    const ctx = await setup();
    const now = Date.now();
    for (let i = 0; i < MAX_OPEN_UPLOADS_PER_PRINCIPAL; i += 1) {
      await ctx.db.jord.query(
        "INSERT INTO jord_uploads (id, bucket, object_key, principal, content_type, total_size, part_size, parts_expected, provider_upload_id, storage_kind, status, created_at, updated_at, expires_at) VALUES (?, 'lab', 'k', 'operator:admin', 'x', 8, 4, 2, 'u', 'local', 'open', ?, ?, ?)",
        [`id${i}`, now, now, now + 100_000],
      );
    }
    const res = await create(ctx, { key: "over", size: 8, part_size: 4 });
    expect(res.status).toBe(429);
    const n = await ctx.db.jord.query("SELECT COUNT(*) AS n FROM jord_uploads", []);
    expect(Number(n[0]!.n)).toBe(MAX_OPEN_UPLOADS_PER_PRINCIPAL);
  });
});

describe("multipart: planning helpers", () => {
  const row: UploadRow = {
    id: "x",
    bucket: "b",
    objectKey: "k",
    principal: "p",
    contentType: "text/plain",
    totalSize: 10,
    partSize: 4,
    partsExpected: 3,
    providerUploadId: "u",
    storageKind: "s3",
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    expiresAt: 1,
  };

  it("derives part counts and rejects bad plans", () => {
    expect(planParts({ totalSize: 10, partSize: 4, minPartBytes: 4 })).toEqual({
      ok: true,
      partSize: 4,
      partsExpected: 3,
    });
    expect(planParts({ totalSize: 1.5, partSize: 4, minPartBytes: 4 }).ok).toBe(false);
    const big = planParts({ totalSize: 1024 ** 3, partSize: undefined, minPartBytes: 4 });
    expect(big).toMatchObject({ ok: true, partsExpected: 64 });
  });

  it("verifyParts checks coverage, sizes and etags", () => {
    const good = [
      { partNumber: 1, size: 4, etag: "a" },
      { partNumber: 2, size: 4, etag: "b" },
      { partNumber: 3, size: 2, etag: "c" },
    ];
    expect(verifyParts(row, good).ok).toBe(true);
    expect(verifyParts(row, good.slice(0, 2)).ok).toBe(false);
    expect(verifyParts(row, [good[0]!, good[1]!, { ...good[2]!, size: 4 }]).ok).toBe(false);
    expect(
      verifyParts(row, good, [
        { partNumber: 1, etag: '"a"' },
        { partNumber: 2, etag: "b" },
        { partNumber: 3, etag: "c" },
      ]).ok,
    ).toBe(true);
    expect(
      verifyParts(row, good, [
        { partNumber: 1, etag: "a" },
        { partNumber: 2, etag: "zz" },
        { partNumber: 3, etag: "c" },
      ]).ok,
    ).toBe(false);
  });
});

describe("multipart: S3 adapter (stubbed client)", () => {
  it("presigns UploadPart URLs and lists parts across pages", async () => {
    const real = new S3Client({
      region: "us-east-1",
      endpoint: "http://127.0.0.1:9000",
      forcePathStyle: true,
      credentials: { accessKeyId: "k", secretAccessKey: "s" },
    });
    const pages = [
      {
        Parts: [{ PartNumber: 1, Size: 5, ETag: '"e1"' }],
        IsTruncated: true,
        NextPartNumberMarker: "1",
      },
      { Parts: [{ PartNumber: 2, Size: 3, ETag: '"e2"' }], IsTruncated: false },
    ];
    const markers: Array<string | undefined> = [];
    const send = real.send.bind(real);
    real.send = (async (cmd: { input: { PartNumberMarker?: string } }) => {
      if (cmd.constructor.name === "ListPartsCommand") {
        markers.push(cmd.input.PartNumberMarker);
        return pages[markers.length - 1];
      }
      return send(cmd as never);
    }) as never;
    const s3 = createS3StorageAdapter({ client: real, physicalBucket: "phys" });

    const url = await s3.presign({
      bucket: "lab",
      key: "o.bin",
      intent: "upload",
      expiresInSeconds: 60,
      uploadId: "UP1",
      partNumber: 3,
    });
    expect(url.method).toBe("PUT");
    const qs = new URL(url.url).searchParams;
    expect(qs.get("partNumber")).toBe("3");
    expect(qs.get("uploadId")).toBe("UP1");

    const parts = await s3.listMultipartParts!({
      bucket: "lab",
      key: "o.bin",
      uploadId: "UP1",
    });
    expect(parts).toEqual([
      { partNumber: 1, size: 5, etag: "e1" },
      { partNumber: 2, size: 3, etag: "e2" },
    ]);
    expect(markers).toEqual([undefined, "1"]);
  });
});
