import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import { createLocalStorageAdapter } from "../storage/local.js";
import { gcExpiredPendingBlobs } from "../storage/lifecycle.js";
import type { JordStoragePort } from "../storage/port.js";
import {
  openTestDb,
  TEST_BACKENDS,
  type TestBackend,
  type TestDb,
} from "../testing/harness.js";

const AUTH: JordAuthConfig = {
  secret: "test-blob-delete-secret",
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
  vi.restoreAllMocks();
  while (dbs.length > 0) await dbs.pop()?.close();
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-blob-del-"));
  temps.push(dir);
  const db = await openTestDb(backend);
  dbs.push(db);
  const storage = createLocalStorageAdapter({
    root: path.join(dir, "blobs"),
    hmacSecret: "s",
    publicBaseUrl: "http://127.0.0.1:8787",
  });
  return { db, jord: db.jord, storage };
}

function appWith(
  jord: TestDb["jord"],
  storage: JordStoragePort,
) {
  return createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    storage,
    blobSigningSecret: AUTH.secret,
  });
}

async function putReady(
  jord: TestDb["jord"],
  storage: JordStoragePort,
  key: string,
) {
  const bytes = new TextEncoder().encode("payload");
  await storage.putObject("lab", key, bytes, "text/plain");
  await jord.upsertBlobMeta({
    bucket: "lab",
    key,
    contentType: "text/plain",
    size: bytes.length,
    etag: "e",
    status: "ready",
  });
}

const url = (key: string) => `/blobs/lab/objects/${encodeURIComponent(key)}`;

describe.each(TEST_BACKENDS)("blob DELETE storage failures (%s)", (name) => {
  beforeEach(() => {
    backend = name;
  });

  it("502 and keeps metadata when the byte delete throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { jord, storage } = await setup();
    await putReady(jord, storage, "a.txt");
    const failing: JordStoragePort = {
      ...storage,
      deleteObject: async () => {
        throw new Error("s3 boom internal-detail");
      },
    };
    const app = appWith(jord, failing);

    const res = await app.request(url("a.txt"), { method: "DELETE", headers });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "storage_delete_failed" });
    expect(text).not.toContain("internal-detail");
    expect(errSpy).toHaveBeenCalled();

    expect((await jord.getBlobMeta("lab", "a.txt"))?.status).toBe("ready");
    const get = await app.request(url("a.txt"), { headers });
    expect(get.status).toBe(200);
    expect(await get.text()).toBe("payload");

    // retry works once storage recovers
    const ok = await appWith(jord, storage).request(url("a.txt"), {
      method: "DELETE",
      headers,
    });
    expect(ok.status).toBe(200);
    expect(await jord.getBlobMeta("lab", "a.txt")).toBeNull();
  });

  it("200 and drops meta when bytes are already absent", async () => {
    const { jord, storage } = await setup();
    await jord.upsertBlobMeta({
      bucket: "lab",
      key: "ghost.txt",
      contentType: "text/plain",
      size: 1,
      etag: "e",
      status: "ready",
    });
    const res = await appWith(jord, storage).request(url("ghost.txt"), {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(200);
    expect(await jord.getBlobMeta("lab", "ghost.txt")).toBeNull();
  });

  it("200 and removes meta + bytes on a normal delete", async () => {
    const { jord, storage } = await setup();
    await putReady(jord, storage, "n.txt");
    const res = await appWith(jord, storage).request(url("n.txt"), {
      method: "DELETE",
      headers,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, key: "n.txt" });
    expect(await jord.getBlobMeta("lab", "n.txt")).toBeNull();
    expect(await storage.getObject("lab", "n.txt")).toBeNull();
  });

  it("GC keeps a row whose byte delete fails and continues to others", async () => {
    const { jord, storage } = await setup();
    for (const key of ["bad.bin", "good.bin"]) {
      await jord.upsertBlobMeta({
        bucket: "lab",
        key,
        contentType: "application/octet-stream",
        size: 0,
        etag: "",
        status: "pending",
        pendingExpiresAt: Date.now() - 1,
      });
    }
    const flaky: JordStoragePort = {
      ...storage,
      deleteObject: async (bucket, key) => {
        if (key === "bad.bin") throw new Error("boom");
        return storage.deleteObject(bucket, key);
      },
    };
    const gc = await gcExpiredPendingBlobs({ jord, storage: flaky });
    expect(gc.deletedPending).toBe(1);
    expect(gc.errors).toHaveLength(1);
    expect(await jord.getBlobMeta("lab", "bad.bin")).not.toBeNull();
    expect(await jord.getBlobMeta("lab", "good.bin")).toBeNull();
  });
});
