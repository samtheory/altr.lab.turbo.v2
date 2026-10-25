import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createWriteQueue } from "../queue.js";
import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import {
  buildLocalSignedUrl,
  clampSignTtlSeconds,
  DEFAULT_SIGN_TTL_SECONDS,
  MAX_SIGN_TTL_SECONDS,
  verifyLocalSignature,
} from "./index.js";
import { createLocalStorageAdapter } from "./local.js";
import {
  createPendingBlobMeta,
  finalizeBlob,
  FinalizeError,
  gcExpiredPendingBlobs,
} from "./lifecycle.js";
import { buildLocalToRemoteCopyPlan } from "./copy-plan.js";
import { assertSignAllowed } from "./sign-policy.js";

const TEST_AUTH: JordAuthConfig = {
  secret: "test-storage-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};

const temps: string[] = [];

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    try {
      const { rm } = await import("node:fs/promises");
      await rm(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

async function tempDir(prefix: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  temps.push(dir);
  return dir;
}

function authHeaders(role: "admin" | "editor" | "readonly" = "admin") {
  return {
    Authorization: `Bearer ${signSessionToken(role, TEST_AUTH.secret)}`,
  };
}

describe("sign TTL", () => {
  it("defaults to 15m and caps at 1h", () => {
    expect(clampSignTtlSeconds(undefined)).toBe(DEFAULT_SIGN_TTL_SECONDS);
    expect(clampSignTtlSeconds(-1)).toBe(DEFAULT_SIGN_TTL_SECONDS);
    expect(clampSignTtlSeconds(30)).toBe(30);
    expect(clampSignTtlSeconds(MAX_SIGN_TTL_SECONDS + 60)).toBe(
      MAX_SIGN_TTL_SECONDS,
    );
  });
});

describe("local HMAC URL shape", () => {
  it("signs and verifies with shared query params", () => {
    const secret = "hmac-test";
    const expiresAt = Date.now() + 60_000;
    const url = buildLocalSignedUrl({
      baseUrl: "http://127.0.0.1:8787",
      secret,
      params: {
        bucket: "lab",
        key: "note.txt",
        method: "PUT",
        expiresAt,
        contentType: "text/plain",
      },
    });
    expect(url).toContain("/blobs/signed/lab/objects/note.txt?");
    expect(url).toContain("X-Jord-Algorithm=JORD1-HMAC-SHA256");
    expect(url).toContain("X-Jord-Signature=");
    const qs = new URL(url).searchParams;
    expect(
      verifyLocalSignature(
        secret,
        {
          bucket: "lab",
          key: "note.txt",
          method: "PUT",
          expiresAt,
          contentType: "text/plain",
        },
        qs.get("X-Jord-Signature")!,
      ),
    ).toBe(true);
  });

  it("rejects expired signatures", () => {
    const secret = "hmac-test";
    const expiresAt = Date.now() - 1;
    const sig = buildLocalSignedUrl({
      baseUrl: "http://127.0.0.1:8787",
      secret,
      params: {
        bucket: "lab",
        key: "a",
        method: "GET",
        expiresAt,
      },
    });
    const signature = new URL(sig).searchParams.get("X-Jord-Signature")!;
    expect(
      verifyLocalSignature(
        secret,
        { bucket: "lab", key: "a", method: "GET", expiresAt },
        signature,
      ),
    ).toBe(false);
  });
});

describe("pending / finalize / GC", () => {
  it("promotes pending after bytes exist and GCs expired pending", async () => {
    const dir = await tempDir("jord-storage-");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const storage = createLocalStorageAdapter({
      root: path.join(dir, "blobs"),
      hmacSecret: "s",
      publicBaseUrl: "http://127.0.0.1:8787",
    });
    try {
      const expiresAt = Date.now() + 60_000;
      await createPendingBlobMeta({
        jord,
        bucket: "lab",
        key: "pending.bin",
        contentType: "application/octet-stream",
        pendingExpiresAt: expiresAt,
      });

      await expect(
        finalizeBlob({
          jord,
          storage,
          bucket: "lab",
          key: "pending.bin",
        }),
      ).rejects.toBeInstanceOf(FinalizeError);

      await storage.putObject(
        "lab",
        "pending.bin",
        new TextEncoder().encode("hello"),
        "application/octet-stream",
      );
      const ready = await finalizeBlob({
        jord,
        storage,
        bucket: "lab",
        key: "pending.bin",
      });
      expect(ready.status).toBe("ready");
      expect(ready.size).toBe(5);

      await createPendingBlobMeta({
        jord,
        bucket: "lab",
        key: "stale.bin",
        contentType: "application/octet-stream",
        pendingExpiresAt: Date.now() - 1,
      });
      await storage.putObject(
        "lab",
        "stale.bin",
        new TextEncoder().encode("gone"),
        "application/octet-stream",
      );
      const gc = await gcExpiredPendingBlobs({
        jord,
        storage,
        nowMs: Date.now(),
      });
      expect(gc.deletedPending).toBe(1);
      expect(await jord.getBlobMeta("lab", "stale.bin")).toBeNull();
      expect(await storage.getObject("lab", "stale.bin")).toBeNull();
      expect((await jord.getBlobMeta("lab", "pending.bin"))?.status).toBe(
        "ready",
      );
    } finally {
      await jord.close();
    }
  });
});

describe("copy/verify plan", () => {
  it("never sets deleteLocal and plans copy without silent delete", async () => {
    const dir = await tempDir("jord-copy-");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const blobsRoot = path.join(dir, "blobs");
    await mkdir(path.join(blobsRoot, "lab"), { recursive: true });
    await writeFile(path.join(blobsRoot, "lab", "a.txt"), "alpha");
    try {
      const plan = await buildLocalToRemoteCopyPlan({
        jord,
        localRoot: blobsRoot,
      });
      expect(plan.dryRun).toBe(true);
      expect(plan.deleteLocal).toBe(false);
      expect(plan.switchRequiresExplicitFlag).toBe(true);
      expect(plan.wouldCopy).toBe(1);
      expect(plan.steps.some((s) => s.includes("Do NOT delete local"))).toBe(
        true,
      );
    } finally {
      await jord.close();
    }
  });
});

describe("sign-time policy", () => {
  it("denies minting when a deny policy matches the bucket", async () => {
    const dir = await tempDir("jord-sign-");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    try {
      await jord.insertPolicy({
        name: "deny-lab-blobs",
        tableName: "jord_blobs",
        operation: "insert",
        effect: "deny",
        priority: 100,
        rules: JSON.stringify([
          { kind: "bucket_eq", config: { bucket: "secret" } },
        ]),
      });

      const denied = await assertSignAllowed({
        jord,
        principal: {
          kind: "operator",
          role: "editor",
          claims: {},
        },
        bucket: "secret",
        intent: "upload",
      });
      expect(denied.allowed).toBe(false);

      const allowed = await assertSignAllowed({
        jord,
        principal: {
          kind: "operator",
          role: "editor",
          claims: {},
        },
        bucket: "lab",
        intent: "upload",
      });
      expect(allowed.allowed).toBe(true);
    } finally {
      await jord.close();
    }
  });

  it("HTTP sign returns 403 when policy denies even if object meta exists", async () => {
    const dir = await tempDir("jord-sign-http-");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const enqueueWrite = createWriteQueue();
    const blobsRoot = path.join(dir, "blobs");
    const app = createJordApp({
      jord,
      enqueueWrite,
      auth: TEST_AUTH,
      blobsRoot,
      blobSigningSecret: TEST_AUTH.secret,
    });
    try {
      await jord.upsertBlobMeta({
        bucket: "locked",
        key: "x.bin",
        contentType: "application/octet-stream",
        size: 1,
        etag: "abc",
        status: "ready",
      });
      await jord.insertPolicy({
        name: "deny-locked",
        tableName: "jord_blobs",
        operation: "select",
        effect: "deny",
        priority: 50,
        rules: JSON.stringify([
          { kind: "bucket_eq", config: { bucket: "locked" } },
        ]),
      });

      const res = await app.request(
        `/blobs/locked/objects/${encodeURIComponent("x.bin")}/sign`,
        {
          method: "POST",
          headers: {
            ...authHeaders("editor"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ intent: "download" }),
        },
      );
      expect(res.status).toBe(403);
    } finally {
      await jord.close();
    }
  });

  it("sign + local HMAC upload + finalize shares client shape", async () => {
    const dir = await tempDir("jord-sign-flow-");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "jord.db")),
    });
    const enqueueWrite = createWriteQueue();
    const blobsRoot = path.join(dir, "blobs");
    const app = createJordApp({
      jord,
      enqueueWrite,
      auth: TEST_AUTH,
      blobsRoot,
      blobSigningSecret: TEST_AUTH.secret,
      env: {
        ...process.env,
        JORD_PUBLIC_BASE_URL: "http://127.0.0.1:8787",
      },
    });
    try {
      const sign = await app.request(
        `/blobs/lab/objects/${encodeURIComponent("flow.txt")}/sign`,
        {
          method: "POST",
          headers: {
            ...authHeaders("editor"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent: "upload",
            content_type: "text/plain",
            ttl_seconds: 120,
          }),
        },
      );
      expect(sign.status).toBe(200);
      const signed = (await sign.json()) as {
        url: string;
        method: string;
        headers: Record<string, string>;
        expires_at: number;
        object: { status: string };
        storage: string;
      };
      expect(signed.method).toBe("PUT");
      expect(signed.storage).toBe("local");
      expect(signed.object.status).toBe("pending");
      expect(signed.url).toContain("/blobs/signed/");
      expect(signed.headers["Content-Type"]).toBe("text/plain");

      const pathAndQuery = signed.url.replace(/^https?:\/\/[^/]+/, "");
      const put = await app.request(pathAndQuery, {
        method: "PUT",
        headers: signed.headers,
        body: "flow-body",
      });
      expect(put.status).toBe(200);

      const fin = await app.request(
        `/blobs/lab/objects/${encodeURIComponent("flow.txt")}/finalize`,
        {
          method: "POST",
          headers: {
            ...authHeaders("editor"),
            "Content-Type": "application/json",
          },
          body: "{}",
        },
      );
      expect(fin.status).toBe(200);
      const ready = (await fin.json()) as { status: string; size: number };
      expect(ready.status).toBe("ready");
      expect(ready.size).toBe("flow-body".length);
    } finally {
      await jord.close();
    }
  });
});
