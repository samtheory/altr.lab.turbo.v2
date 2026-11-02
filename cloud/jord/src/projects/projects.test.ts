import { randomBytes } from "node:crypto";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import {
  createAesGcmSecretPort,
  createJordClient,
  fsPathToFileUrl,
  type JordProjectEngine,
} from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";
import type { ProjectConnectInput } from "./connect-test.js";

const temps: string[] = [];

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: "jwt-current-secret",
  jwtSecretPrevious: "jwt-previous-secret",
  jwtIss: "jord",
  jwtAud: "jord",
};

afterEach(async () => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (!dir) continue;
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
});

function bearer(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

function adminHeaders(): Record<string, string> {
  return bearer(signSessionToken("admin", AUTH.secret));
}

function editorHeaders(): Record<string, string> {
  return bearer(signSessionToken("editor", AUTH.secret));
}

function assertNoCredentialFields(payload: unknown): void {
  const text = JSON.stringify(payload);
  expect(text).not.toMatch(/"password"/);
  expect(text).not.toMatch(/"secret_key"/);
  expect(text).not.toMatch(/"db_password/);
  expect(text).not.toMatch(/"key_hash"/);
  expect(text).not.toMatch(/"db_password_sealed"/);
}

async function boot(options?: {
  connectOk?: boolean;
  connectError?: string;
}) {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-projects-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "control.db")),
  });
  const secrets = createAesGcmSecretPort({ masterKey: randomBytes(32) });
  const connectOk = options?.connectOk !== false;
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    secrets,
    projectConnectTest: async () =>
      connectOk
        ? { ok: true }
        : { ok: false, error: options?.connectError ?? "refused" },
    projectBaseline: async () => undefined,
  });
  return { app, jord, secrets, dir };
}

const ENGINES: JordProjectEngine[] = [
  "libsql-file",
  "libsql-turso",
  "postgres",
];

function createBody(engine: JordProjectEngine, slug: string) {
  if (engine === "libsql-file") {
    return {
      slug,
      engine,
      target: "./data/project.db",
      notes: "file project",
    };
  }
  if (engine === "libsql-turso") {
    return {
      slug,
      engine,
      target: "libsql://example.turso.io",
      password: "turso-token",
      notes: "turso project",
    };
  }
  return {
    slug,
    engine,
    target: "postgres://localhost:5432/app",
    db_user: "jord",
    password: "s3cret-password",
    tls_mode: "require" as const,
    notes: "pg project",
  };
}

describe("S0043 project registry API", () => {
  it("creates a project for each engine; secret appears once; list has no secrets", async () => {
    const ctx = await boot();
    const createdSecrets: string[] = [];

    for (const engine of ENGINES) {
      const slug = `proj-${engine.replace(/[^a-z0-9]+/g, "-")}`;
      const res = await ctx.app.request("/admin/projects", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(createBody(engine, slug)),
      });
      expect(res.status, engine).toBe(201);
      const body = (await res.json()) as {
        project: { id: string; engine: string; slug: string };
        secret_key: string;
        publishable_key: string;
        barrier_key: string;
      };
      expect(body.project.engine).toBe(engine);
      expect(body.secret_key.startsWith("jord_sec_")).toBe(true);
      expect(body.publishable_key.startsWith("jord_pub_")).toBe(true);
      expect(body.barrier_key.startsWith("jord_bar_")).toBe(true);
      createdSecrets.push(body.secret_key);

      const detail = await ctx.app.request(`/admin/projects/${body.project.id}`, {
        headers: adminHeaders(),
      });
      expect(detail.status).toBe(200);
      const detailJson = await detail.json();
      assertNoCredentialFields(detailJson);
      expect(JSON.stringify(detailJson)).not.toContain(body.secret_key);
    }

    const list = await ctx.app.request("/admin/projects", {
      headers: adminHeaders(),
    });
    expect(list.status).toBe(200);
    const listJson = (await list.json()) as { projects: unknown[] };
    expect(listJson.projects).toHaveLength(3);
    assertNoCredentialFields(listJson);
    for (const secret of createdSecrets) {
      expect(JSON.stringify(listJson)).not.toContain(secret);
    }
  });

  it("failed connect test leaves no project row", async () => {
    const ctx = await boot({
      connectOk: false,
      connectError: "connection refused (mock)",
    });
    const res = await ctx.app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(createBody("postgres", "no-row")),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: "connect_failed",
      detail: "connection refused (mock)",
    });
    const rows = await ctx.jord.query(`SELECT id FROM jord_projects`);
    expect(rows).toHaveLength(0);
  });

  it("archive revokes keys and GET returns 410", async () => {
    const ctx = await boot();
    const created = await ctx.app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(createBody("libsql-file", "to-archive")),
    });
    expect(created.status).toBe(201);
    const { project } = (await created.json()) as {
      project: { id: string; slug: string };
    };

    const archived = await ctx.app.request(`/admin/projects/${project.id}`, {
      method: "DELETE",
      headers: adminHeaders(),
    });
    expect(archived.status).toBe(200);

    const keys = await ctx.jord.query(
      `SELECT id FROM jord_project_keys WHERE project_id = ?`,
      [project.id],
    );
    expect(keys).toHaveLength(0);

    const get = await ctx.app.request(`/admin/projects/${project.id}`, {
      headers: adminHeaders(),
    });
    expect(get.status).toBe(410);
    expect(await get.json()).toMatchObject({
      error: "project_archived",
      reason: "project is archived; keys are revoked",
    });

    const bySlug = await ctx.app.request(
      `/admin/projects/by-slug/${project.slug}`,
      { headers: adminHeaders() },
    );
    expect(bySlug.status).toBe(410);

    const studioGone = await ctx.app.request(`/studio/projects/${project.slug}`, {
      headers: adminHeaders(),
    });
    expect(studioGone.status).toBe(410);
  });

  it("S0045 studio catalog lists active; unknown slug 404; by-slug works", async () => {
    const ctx = await boot();
    const created = await ctx.app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(createBody("libsql-file", "scoped-one")),
    });
    expect(created.status).toBe(201);

    const catalog = await ctx.app.request("/studio/projects", {
      headers: adminHeaders(),
    });
    expect(catalog.status).toBe(200);
    const catalogBody = (await catalog.json()) as {
      projects: Array<{ slug: string }>;
    };
    expect(catalogBody.projects.some((p) => p.slug === "scoped-one")).toBe(true);

    const found = await ctx.app.request("/studio/projects/scoped-one", {
      headers: adminHeaders(),
    });
    expect(found.status).toBe(200);

    const missing = await ctx.app.request("/studio/projects/does-not-exist", {
      headers: adminHeaders(),
    });
    expect(missing.status).toBe(404);

    const adminBySlug = await ctx.app.request(
      "/admin/projects/by-slug/scoped-one",
      { headers: adminHeaders() },
    );
    expect(adminBySlug.status).toBe(200);
  });

  it("POST /admin/projects/test is ephemeral and does not write rows", async () => {
    const seen: ProjectConnectInput[] = [];
    const dir = await mkdtemp(path.join(tmpdir(), "jord-projects-test-"));
    temps.push(dir);
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "control.db")),
    });
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
      projectConnectTest: async (input) => {
        seen.push(input);
        return { ok: true };
      },
    });

    const res = await app.request("/admin/projects/test", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        engine: "postgres",
        target: "postgres://localhost:5432/x",
        password: "pw",
        db_user: "u",
      }),
    });
    expect(res.status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.password).toBe("pw");
    const rows = await jord.query(`SELECT id FROM jord_projects`);
    expect(rows).toHaveLength(0);
  });

  it("admin-only: editor is forbidden on project routes", async () => {
    const ctx = await boot();
    const denied = await ctx.app.request("/admin/projects", {
      headers: editorHeaders(),
    });
    expect(denied.status).toBe(403);
  });

  it("real libsql-file connect test opens a temp database", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-projects-live-"));
    temps.push(dir);
    const target = path.join(dir, "target.db");
    const jord = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "control.db")),
    });
    const app = createJordApp({
      jord,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
      // Use real default connect + baseline for file engine.
    });

    const testRes = await app.request("/admin/projects/test", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        engine: "libsql-file",
        target,
      }),
    });
    expect(testRes.status).toBe(200);

    const createRes = await app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        slug: "live-file",
        engine: "libsql-file",
        target,
      }),
    });
    expect(createRes.status).toBe(201);
    const body = await createRes.json();
    assertNoCredentialFields({ project: (body as { project: unknown }).project });
  });
});

describe("S0062 ERD layout API", () => {
  it("round-trips layout per project + schema (id and slug)", async () => {
    const ctx = await boot();
    const created = await ctx.app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify(createBody("libsql-file", "layout-proj")),
    });
    expect(created.status).toBe(201);
    const { project } = (await created.json()) as {
      project: { id: string; slug: string };
    };

    const empty = await ctx.app.request(
      `/admin/projects/${project.id}/layout?schema=public`,
      { headers: adminHeaders() },
    );
    expect(empty.status).toBe(200);
    const emptyBody = (await empty.json()) as {
      layout: { schema: string; nodes: unknown[] };
    };
    expect(emptyBody.layout.schema).toBe("public");
    expect(emptyBody.layout.nodes).toEqual([]);

    const nodes = [
      { schema: "public", table: "users", x: 12, y: 34, collapsed: false },
      { schema: "public", table: "posts", x: 240, y: 34, collapsed: true },
    ];
    const put = await ctx.app.request(`/admin/projects/${project.slug}/layout`, {
      method: "PUT",
      headers: adminHeaders(),
      body: JSON.stringify({ schema: "public", nodes }),
    });
    expect(put.status).toBe(200);
    const putBody = (await put.json()) as {
      layout: { nodes: typeof nodes; updatedAt: number };
    };
    expect(putBody.layout.nodes).toEqual(nodes);
    expect(putBody.layout.updatedAt).toBeGreaterThan(0);

    const get = await ctx.app.request(
      `/admin/projects/${project.id}/layout?schema=public`,
      { headers: adminHeaders() },
    );
    expect(get.status).toBe(200);
    const getBody = (await get.json()) as { layout: { nodes: typeof nodes } };
    expect(getBody.layout.nodes).toEqual(nodes);

    const other = await ctx.app.request(
      `/admin/projects/${project.id}/layout?schema=app`,
      { headers: adminHeaders() },
    );
    const otherBody = (await other.json()) as { layout: { nodes: unknown[] } };
    expect(otherBody.layout.nodes).toEqual([]);

    const denied = await ctx.app.request(
      `/admin/projects/${project.id}/layout?schema=public`,
      { headers: editorHeaders() },
    );
    expect(denied.status).toBe(403);
  });
});
