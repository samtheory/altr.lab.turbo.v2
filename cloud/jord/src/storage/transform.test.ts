import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import { afterEach, describe, expect, it } from "vitest";

import { isValidBlobKey } from "@altr/jord";
import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { gcOrphanDerivatives as gcOrphans } from "./transform.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, type TestDb } from "../testing/harness.js";
import { createLocalStorageAdapter } from "./local.js";
import {
  createTransformService,
  derivativeKey,
  parseDerivativeKey,
  parseTransformParams,
  probeImage,
  TransformError,
  workerRenderer,
  type Renderer,
} from "./transform.js";

const AUTH: JordAuthConfig = {
  secret: "test-transform-secret",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: null,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const bearer = { Authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}` };

const temps: string[] = [];
const dbs: TestDb[] = [];
afterEach(async () => {
  while (dbs.length > 0) await dbs.pop()?.close();
  while (temps.length > 0) {
    const d = temps.pop();
    if (d) await rm(d, { recursive: true, force: true }).catch(() => {});
  }
});

function makePng(w: number, h: number, alpha = 255): Uint8Array {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      png.data[i] = (x * 255) / w;
      png.data[i + 1] = (y * 255) / h;
      png.data[i + 2] = 128;
      png.data[i + 3] = alpha;
    }
  }
  return new Uint8Array(PNG.sync.write(png));
}
function makeJpeg(w: number, h: number): Uint8Array {
  const data = Buffer.alloc(w * h * 4, 200);
  return new Uint8Array(jpeg.encode({ data, width: w, height: h }, 80).data);
}
/** Header-only PNG claiming huge dimensions; the body is garbage. */
function fakeHugePng(w: number, h: number): Uint8Array {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return new Uint8Array(b);
}
function fakeHugeJpeg(w: number, h: number): Uint8Array {
  const b = Buffer.from([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9,
  ]);
  return new Uint8Array(b);
}

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-xf-"));
  temps.push(dir);
  const db = await openTestDb("file");
  dbs.push(db);
  const root = path.join(dir, "blobs");
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
    env: {} as NodeJS.ProcessEnv,
    createBucketPort: () => storage,
  });
  const put = async (key: string, bytes: Uint8Array, ct = "image/png") =>
    app.request(`/blobs/media/objects/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { ...bearer, "content-type": ct },
      body: bytes as unknown as BodyInit,
    });
  const sign = async (key: string, transform: unknown) => {
    const res = await app.request(
      `/blobs/media/objects/${encodeURIComponent(key)}/sign`,
      {
        method: "POST",
        headers: { ...bearer, "content-type": "application/json" },
        body: JSON.stringify({ intent: "download", transform }),
      },
    );
    return res;
  };
  const rel = (u: string) => {
    const x = new URL(u);
    return x.pathname + x.search;
  };
  return { app, db, storage, put, sign, rel };
}

describe("S0082 params + keys", () => {
  it("same transform yields the same key; different params differ", () => {
    const a = parseTransformParams({ w: "320", h: "200", fit: "cover", q: "70", fm: "jpg" });
    const b = parseTransformParams({ fm: "jpeg", q: "70", fit: "cover", h: "200", w: "320" });
    expect(derivativeKey("a/b.png", a, "jpeg")).toBe(derivativeKey("a/b.png", b, "jpeg"));
    const c = parseTransformParams({ w: "321", h: "200" });
    expect(derivativeKey("a/b.png", c, "jpeg")).not.toBe(derivativeKey("a/b.png", a, "jpeg"));
    const k = derivativeKey("a/b.png", a, "jpeg");
    expect(k).toMatch(/^a\/b\.png\.[0-9a-f]{16}\.jpg$/);
    expect(parseDerivativeKey(k)?.original).toBe("a/b.png");
    // quality does not change a png key
    const p1 = parseTransformParams({ w: "10", q: "10" });
    const p2 = parseTransformParams({ w: "10", q: "90" });
    expect(derivativeKey("x", p1, "png")).toBe(derivativeKey("x", p2, "png"));
  });

  it("rejects bad params", () => {
    for (const bad of [
      {},
      { w: "0" },
      { w: "4097" },
      { w: "abc" },
      { w: "10", fit: "stretch" },
      { w: "10", q: "0" },
      { w: "10", q: "101" },
      { w: "10", fm: "webp" },
      { w: "10", fm: "svg" },
    ]) {
      expect(() => parseTransformParams(bad)).toThrow(TransformError);
    }
  });

  it("probes headers without decoding and sniffs magic bytes", () => {
    expect(probeImage(fakeHugePng(9000, 9000))).toMatchObject({ format: "png", width: 9000 });
    expect(probeImage(fakeHugeJpeg(9000, 8000))).toMatchObject({ format: "jpeg", width: 9000, height: 8000 });
    expect(() => probeImage(new TextEncoder().encode("<svg xmlns='x'></svg>"))).toThrow(/jpeg and png/);
    expect(() => probeImage(new TextEncoder().encode("hello world, not an image"))).toThrow(TransformError);
  });
});

describe("S0082 worker renderer", () => {
  it("resizes png (cover/contain/fill) and jpeg", async () => {
    const png = makePng(200, 100);
    const run = (src: Uint8Array, fmt: "png" | "jpeg", p: Record<string, string>) =>
      workerRenderer({
        bytes: src,
        format: fmt,
        params: { ...parseTransformParams(p), fm: fmt === "png" ? "png" : "jpeg" },
        timeoutMs: 10_000,
      });
    const cover = await run(png, "png", { w: "50", h: "50", fit: "cover", fm: "png" });
    expect(PNG.sync.read(Buffer.from(cover.bytes))).toMatchObject({ width: 50, height: 50 });
    const contain = await run(png, "png", { w: "50", h: "50", fit: "contain", fm: "png" });
    expect([contain.width, contain.height]).toEqual([50, 25]);
    const fill = await run(png, "png", { w: "30", h: "60", fit: "fill", fm: "png" });
    expect([fill.width, fill.height]).toEqual([30, 60]);
    const wOnly = await run(png, "png", { w: "100", fm: "png" });
    expect([wOnly.width, wOnly.height]).toEqual([100, 50]);
    const j = await run(makeJpeg(120, 80), "jpeg", { h: "40", fm: "jpeg" });
    const dec = jpeg.decode(Buffer.from(j.bytes), { useTArray: true });
    expect([dec.width, dec.height]).toEqual([60, 40]);
  });

  it("times out instead of hanging", async () => {
    await expect(
      workerRenderer({
        bytes: makePng(300, 300),
        format: "png",
        params: { ...parseTransformParams({ w: "4000", h: "4000", fm: "png" }), fm: "png" },
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({ status: 504 });
  });
});

describe("S0082 service", () => {
  async function svc(render?: Renderer, extra: Record<string, number> = {}) {
    const ctx = await setup();
    let renders = 0;
    const counting: Renderer = (i) => {
      renders += 1;
      return (render ?? workerRenderer)(i);
    };
    const service = createTransformService({
      jord: ctx.db.jord,
      enqueueWrite: createWriteQueue(),
      render: counting,
      ...extra,
    });
    await ctx.storage.ensureBucket("media");
    return { ...ctx, service, count: () => renders };
  }
  const seed = async (c: Awaited<ReturnType<typeof svc>>, key: string, bytes: Uint8Array, ct = "image/png") => {
    expect((await c.put(key, bytes, ct)).status).toBe(200);
  };

  it("cache hit does not re-render; concurrent misses single-flight", async () => {
    const c = await svc();
    await seed(c, "p.png", makePng(80, 40));
    const params = parseTransformParams({ w: "20", fm: "png" });
    const [a, b] = await Promise.all([
      c.service.serve({ bucket: "media", key: "p.png", port: c.storage, params }),
      c.service.serve({ bucket: "media", key: "p.png", port: c.storage, params }),
    ]);
    expect(a.cache).toBe("miss");
    expect(b.key).toBe(a.key);
    expect(c.count()).toBe(1);
    const hit = await c.service.serve({ bucket: "media", key: "p.png", port: c.storage, params });
    expect(hit.cache).toBe("hit");
    expect(c.count()).toBe(1);
    // fm=auto resolves to the same derivative via content-type hint
    const auto = await c.service.serve({
      bucket: "media", key: "p.png", port: c.storage, params: parseTransformParams({ w: "20" }),
    });
    expect(auto.contentType).toBe("image/png");
    const meta = await c.db.jord.getBlobMeta("media", a.key);
    expect(meta?.status).toBe("ready");
  });

  it("rejects over-budget images before decode (renderer never called)", async () => {
    const c = await svc();
    await seed(c, "huge.png", fakeHugePng(8000, 8000));
    await seed(c, "huge.jpg", fakeHugeJpeg(8000, 8000), "image/jpeg");
    for (const key of ["huge.png", "huge.jpg"]) {
      await expect(
        c.service.serve({ bucket: "media", key, port: c.storage, params: parseTransformParams({ w: "10" }) }),
      ).rejects.toMatchObject({ status: 413 });
    }
    expect(c.count()).toBe(0);
    // no leaked pending derivative rows
    expect((await c.db.jord.listBlobs("media")).filter((r) => r.derivedFrom != null)).toHaveLength(0);
  });

  it("rejects oversized source bytes and non-images / svg regardless of content-type", async () => {
    const c = await svc(undefined, { maxSourceBytes: 100 });
    await seed(c, "big.png", makePng(100, 100));
    await expect(
      c.service.serve({ bucket: "media", key: "big.png", port: c.storage, params: parseTransformParams({ w: "10" }) }),
    ).rejects.toMatchObject({ status: 413 });

    const c2 = await svc();
    await seed(c2, "x.svg", new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>"), "image/png");
    await seed(c2, "t.txt", new TextEncoder().encode("plain text"), "image/jpeg");
    for (const key of ["x.svg", "t.txt"]) {
      await expect(
        c2.service.serve({ bucket: "media", key, port: c2.storage, params: parseTransformParams({ w: "10", fm: "png" }) }),
      ).rejects.toMatchObject({ status: 415 });
    }
    expect(c2.count()).toBe(0);
  });

  it("caps concurrent renders (queue overflow -> 503)", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: Renderer = async (i) => {
      await gate;
      return workerRenderer(i);
    };
    const c = await svc(slow, { maxConcurrent: 1, maxQueued: 1 });
    await seed(c, "p.png", makePng(40, 40));
    const ask = (w: string) =>
      c.service.serve({ bucket: "media", key: "p.png", port: c.storage, params: parseTransformParams({ w, fm: "png" }) });
    const p1 = ask("10");
    await new Promise((r) => setTimeout(r, 100));
    const p2 = ask("11");
    await new Promise((r) => setTimeout(r, 100));
    await expect(ask("12")).rejects.toMatchObject({ status: 503 });
    release();
    await Promise.all([p1, p2]);
  });

  it("derivatives are deleted with the original; gc sweeps orphans", async () => {
    const c = await svc();
    await seed(c, "d.png", makePng(40, 40));
    const r1 = await c.service.serve({ bucket: "media", key: "d.png", port: c.storage, params: parseTransformParams({ w: "10", fm: "png" }) });
    const r2 = await c.service.serve({ bucket: "media", key: "d.png", port: c.storage, params: parseTransformParams({ w: "12", fm: "jpeg" }) });
    expect(await c.storage.getObject("media", r1.key)).not.toBeNull();
    const del = await c.app.request("/blobs/media/objects/d.png", { method: "DELETE", headers: bearer });
    expect(del.status).toBe(200);
    for (const k of [r1.key, r2.key]) {
      expect(await c.storage.getObject("media", k)).toBeNull();
      expect(await c.db.jord.getBlobMeta("media", k)).toBeNull();
    }
    // orphan: original row removed behind the API's back
    await seed(c, "o.png", makePng(40, 40));
    const r3 = await c.service.serve({ bucket: "media", key: "o.png", port: c.storage, params: parseTransformParams({ w: "9", fm: "png" }) });
    await c.db.jord.deleteBlobMeta("media", "o.png");
    const swept = await gcOrphans({ jord: c.db.jord, resolveStorage: async () => c.storage });
    expect(swept.orphanDerivatives).toBe(1);
    expect(await c.db.jord.getBlobMeta("media", r3.key)).toBeNull();
  });
});

describe("S0082 signed route", () => {
  it("signed transform url returns resized bytes, then caches", async () => {
    const c = await setup();
    await c.put("s.png", makePng(120, 60));
    const res = await c.sign("s.png", { w: 60, fm: "png" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toContain("/blobs/signed/media/transform/s.png?");
    const first = await c.app.request(c.rel(body.url));
    expect(first.status).toBe(200);
    expect(first.headers.get("x-jord-transform-cache")).toBe("miss");
    expect(first.headers.get("content-type")).toBe("image/png");
    const png = PNG.sync.read(Buffer.from(await first.arrayBuffer()));
    expect([png.width, png.height]).toEqual([60, 30]);
    const second = await c.app.request(c.rel(body.url));
    expect(second.headers.get("x-jord-transform-cache")).toBe("hit");
  });

  it("tampering with any signed transform param -> 403", async () => {
    const c = await setup();
    await c.put("t.png", makePng(120, 60));
    const body = (await (await c.sign("t.png", { w: 60, h: 30, fit: "cover", q: 70, fm: "jpeg" })).json()) as { url: string };
    const base = new URL(body.url);
    const tamper = (mut: (q: URLSearchParams) => void) => {
      const u = new URL(base);
      mut(u.searchParams);
      return c.app.request(u.pathname + u.search);
    };
    expect((await tamper((q) => q.set("w", "61"))).status).toBe(403);
    expect((await tamper((q) => q.set("h", "31"))).status).toBe(403);
    expect((await tamper((q) => q.set("fit", "fill"))).status).toBe(403);
    expect((await tamper((q) => q.set("q", "71"))).status).toBe(403);
    expect((await tamper((q) => q.set("fm", "png"))).status).toBe(403);
    expect((await tamper((q) => q.delete("h"))).status).toBe(403);
    expect((await tamper((q) => q.set("X-Jord-Expires", String(Date.now() + 9e9)))).status).toBe(403);
    // unknown param is refused, invalid value is 400
    expect((await tamper((q) => q.set("evil", "1"))).status).toBe(400);
    expect((await tamper((q) => q.set("w", "99999"))).status).toBe(400);
    // the untouched URL still works
    expect((await c.app.request(c.rel(body.url))).status).toBe(200);
  });

  it("a plain download signature cannot be reused as a transform url", async () => {
    const c = await setup();
    await c.put("u.png", makePng(40, 40));
    const plain = (await (
      await c.app.request("/blobs/media/objects/u.png/sign", {
        method: "POST",
        headers: { ...bearer, "content-type": "application/json" },
        body: JSON.stringify({ intent: "download" }),
      })
    ).json()) as { url: string };
    const u = new URL(plain.url);
    const forged = `/blobs/signed/media/transform/u.png${u.search}&w=10`;
    expect((await c.app.request(forged)).status).toBe(403);
  });

  it("sign refuses bad transform and missing object", async () => {
    const c = await setup();
    await c.put("v.png", makePng(40, 40));
    expect((await c.sign("v.png", { w: 99999 })).status).toBe(400);
    expect((await c.sign("v.png", { w: 10, fm: "webp" })).status).toBe(400);
    expect((await c.sign("nope.png", { w: 10 })).status).toBe(404);
  });

  it("svg and oversized images answer with clear errors via the route", async () => {
    const c = await setup();
    await c.put("a.svg", new TextEncoder().encode("<svg/>"), "image/svg+xml");
    await c.put("huge.png", fakeHugePng(9000, 9000));
    for (const [key, status] of [["a.svg", 415], ["huge.png", 413]] as const) {
      const body = (await (await c.sign(key, { w: 10 })).json()) as { url: string };
      expect((await c.app.request(c.rel(body.url))).status).toBe(status);
    }
  });
});

describe("S0082 security hardening (DB is the source of truth)", () => {
  async function svc(render?: Renderer) {
    const ctx = await setup();
    const service = createTransformService({
      jord: ctx.db.jord,
      enqueueWrite: createWriteQueue(),
      render: render ?? workerRenderer,
    });
    await ctx.storage.ensureBucket("media");
    return { ...ctx, service };
  }
  const png = parseTransformParams({ w: "10", fm: "png" });

  it("look-alike user keys are never cascaded, GC'd or served as derivatives", async () => {
    const c = await svc();
    await c.put("d.png", makePng(40, 40));
    const lookalike = "d.png.0123456789abcdef.png";
    expect((await c.put(lookalike, makePng(8, 8))).status).toBe(200); // hash-named user file is allowed
    const orphanLook = "gone.png.0123456789abcdef.png";
    expect((await c.put(orphanLook, makePng(8, 8))).status).toBe(200);
    expect((await c.app.request("/blobs/media/objects/d.png", { method: "DELETE", headers: bearer })).status).toBe(200);
    expect(await c.db.jord.getBlobMeta("media", lookalike)).not.toBeNull();
    expect(await c.storage.getObject("media", lookalike)).not.toBeNull();
    const swept = await gcOrphans({ jord: c.db.jord, resolveStorage: async () => c.storage });
    expect(swept.orphanDerivatives).toBe(0);
    expect(await c.db.jord.getBlobMeta("media", orphanLook)).not.toBeNull();
    // a look-alike is a plain user object: it can be transformed like any other
    await expect(
      c.service.serve({ bucket: "media", key: lookalike, port: c.storage, params: png }),
    ).resolves.toMatchObject({ cache: "miss" });
  });

  it("normal writes cannot create or overwrite a derivative row", async () => {
    const c = await svc();
    await c.put("w.png", makePng(40, 40));
    const r = await c.service.serve({ bucket: "media", key: "w.png", port: c.storage, params: png });
    expect((await c.db.jord.getBlobMeta("media", r.key))?.derivedFrom).toBe("w.png");
    expect((await c.put(r.key, makePng(8, 8))).status).toBe(409);
    const signUp = await c.app.request(`/blobs/media/objects/${encodeURIComponent(r.key)}/sign`, {
      method: "POST",
      headers: { ...bearer, "content-type": "application/json" },
      body: JSON.stringify({ intent: "upload", content_type: "image/png" }),
    });
    expect(signUp.status).toBe(409);
    const mp = await c.app.request("/blobs/media/uploads", {
      method: "POST",
      headers: { ...bearer, "content-type": "application/json" },
      body: JSON.stringify({ key: r.key, content_type: "image/png", size: 10 * 1024 * 1024 }),
    });
    expect(mp.status).toBe(409);
    expect((await c.db.jord.getBlobMeta("media", r.key))?.derivedFrom).toBe("w.png");
  });

  it("a user row on the derivative key is bypassed, never overwritten or deleted", async () => {
    let fail = false;
    const c = await svc(async (i) => {
      if (fail) throw new TransformError(502, "render_failed");
      return workerRenderer(i);
    });
    await c.put("o.png", makePng(40, 40));
    const etag = (await c.db.jord.getBlobMeta("media", "o.png"))!.etag;
    const dKey = derivativeKey("o.png", png, "png", etag);
    const userBytes = makePng(3, 3);
    expect((await c.put(dKey, userBytes)).status).toBe(200);
    const out = await c.service.serve({ bucket: "media", key: "o.png", port: c.storage, params: png });
    expect(out.cache).toBe("bypass");
    const row = await c.db.jord.getBlobMeta("media", dKey);
    expect(row?.derivedFrom).toBeNull();
    expect(Buffer.from((await c.storage.getObject("media", dKey))!)).toEqual(Buffer.from(userBytes));
    fail = true;
    await expect(
      c.service.serve({ bucket: "media", key: "o.png", port: c.storage, params: png }),
    ).rejects.toMatchObject({ status: 502 });
    expect(await c.db.jord.getBlobMeta("media", dKey)).not.toBeNull();
  });

  it("serves derivatives with a content type from the format, nosniff and inline", async () => {
    const c = await setup();
    await c.put("h.png", makePng(120, 60));
    const url = ((await (await c.sign("h.png", { w: 60, fm: "png" })).json()) as { url: string }).url;
    expect((await c.app.request(c.rel(url))).status).toBe(200);
    const rows = (await c.db.jord.listBlobs("media")).filter((r) => r.derivedFrom != null);
    expect(rows).toHaveLength(1);
    await c.db.jord.upsertBlobMeta({
      bucket: "media", key: rows[0]!.key, contentType: "text/html", size: rows[0]!.size, etag: rows[0]!.etag,
    });
    const hit = await c.app.request(c.rel(url));
    expect(hit.headers.get("x-jord-transform-cache")).toBe("hit");
    expect(hit.headers.get("content-type")).toBe("image/png");
    expect(hit.headers.get("x-content-type-options")).toBe("nosniff");
    expect(hit.headers.get("content-disposition")).toBe("inline");
  });

  it("overwriting the original yields a new derivative; old ones are removed and GC'd", async () => {
    const c = await svc();
    await c.put("s.png", makePng(40, 40));
    const first = await c.service.serve({ bucket: "media", key: "s.png", port: c.storage, params: png });
    await c.put("s.png", makePng(50, 50));
    expect(await c.db.jord.getBlobMeta("media", first.key)).toBeNull(); // overwrite hook
    const second = await c.service.serve({ bucket: "media", key: "s.png", port: c.storage, params: png });
    expect(second.key).not.toBe(first.key);
    expect(second.cache).toBe("miss");
    // stale row resurrected behind the hook's back: not served, swept by gc
    await c.db.jord.upsertBlobMeta({
      bucket: "media", key: first.key, contentType: "image/png", size: 1, etag: "old",
      derivedFrom: "s.png", derivedSrcEtag: "stale-etag",
    });
    const swept = await gcOrphans({ jord: c.db.jord, resolveStorage: async () => c.storage });
    expect(swept.orphanDerivatives).toBe(1);
    expect(await c.db.jord.getBlobMeta("media", first.key)).toBeNull();
    expect(await c.db.jord.getBlobMeta("media", second.key)).not.toBeNull();
  });

  it("caps 16-bit and interlaced png cost at 8 MP; 16 MP overall", async () => {
    const c = await svc();
    const hdr = (w: number, h: number, depth: number, interlace: number) => {
      const b = Buffer.from(fakeHugePng(w, h));
      b[24] = depth;
      b[28] = interlace;
      return new Uint8Array(b);
    };
    await c.put("deep.png", hdr(3000, 3000, 16, 0)); // 9 MP
    await c.put("adam7.png", hdr(3000, 3000, 8, 1));
    await c.put("big.png", hdr(4100, 4100, 8, 0)); // 16.8 MP
    for (const key of ["deep.png", "adam7.png", "big.png"]) {
      await expect(
        c.service.serve({ bucket: "media", key, port: c.storage, params: png }),
      ).rejects.toMatchObject({ status: 413 });
    }
  });

  it("rejects control characters (newline) in blob keys", () => {
    for (const k of ["a\nb", "a\rb", "a\tb", "a\u0000b", "a\u007fb", "a\u001fb"]) {
      expect(isValidBlobKey(k)).toBe(false);
    }
    expect(isValidBlobKey("a/b c.png")).toBe(true);
  });

  it("does not leak worker error text; HEAD never renders", async () => {
    const c = await setup();
    const bad = Buffer.from(fakeHugePng(100, 100));
    await c.put("bad.png", new Uint8Array(Buffer.concat([bad, Buffer.alloc(64, 7)])));
    const url = ((await (await c.sign("bad.png", { w: 10, fm: "png" })).json()) as { url: string }).url;
    const res = await c.app.request(c.rel(url));
    expect(res.status).toBe(422);
    expect(await res.text()).toContain("source_invalid");

    await c.put("ok.png", makePng(120, 60));
    const ok = ((await (await c.sign("ok.png", { w: 60, fm: "png" })).json()) as { url: string }).url;
    const miss = await c.app.request(c.rel(ok), { method: "HEAD" });
    expect(miss.status).toBe(405);
    expect((await c.db.jord.listBlobs("media")).filter((r) => r.derivedFrom != null)).toHaveLength(0);
    expect((await c.app.request(c.rel(ok))).status).toBe(200);
    const hit = await c.app.request(c.rel(ok), { method: "HEAD" });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("content-type")).toBe("image/png");
  });
});
