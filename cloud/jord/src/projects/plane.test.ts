import { randomBytes } from "node:crypto";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import {
  createAesGcmSecretPort,
  createJordClient,
  fsPathToFileUrl,
} from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";

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

function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}`,
    "content-type": "application/json",
    ...extra,
  };
}

describe("S0097 project data-plane fan-out", () => {
  it("routes schema DDL to the X-Jord-Project target, not the primary", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-plane-"));
    temps.push(dir);
    const primaryPath = path.join(dir, "primary.db");
    const aPath = path.join(dir, "project-a.db");
    const bPath = path.join(dir, "project-b.db");

    const primary = await createJordClient({
      url: fsPathToFileUrl(primaryPath),
    });
    const app = createJordApp({
      jord: primary,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
    });

    for (const [slug, target] of [
      ["alpha", aPath],
      ["beta", bPath],
    ] as const) {
      const res = await app.request("/admin/projects", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          slug,
          engine: "libsql-file",
          target,
        }),
      });
      expect(res.status, slug).toBe(201);
    }

    const createOnA = await app.request("/schema/tables", {
      method: "POST",
      headers: adminHeaders({ "X-Jord-Project": "alpha" }),
      body: JSON.stringify({
        name: "orders_a",
        columns: [{ name: "id", type: "TEXT" }],
      }),
    });
    expect(createOnA.status).toBe(201);

    const tablesA = await app.request("/schema/tables", {
      headers: adminHeaders({ "X-Jord-Project": "alpha" }),
    });
    expect(tablesA.status).toBe(200);
    const aBody = (await tablesA.json()) as { tables: string[] };
    expect(aBody.tables).toContain("orders_a");

    const tablesB = await app.request("/schema/tables", {
      headers: adminHeaders({ "X-Jord-Project": "beta" }),
    });
    expect(tablesB.status).toBe(200);
    const bBody = (await tablesB.json()) as { tables: string[] };
    expect(bBody.tables).not.toContain("orders_a");

    const tablesPrimary = await app.request("/schema/tables", {
      headers: adminHeaders({ "X-Jord-Project": "default" }),
    });
    expect(tablesPrimary.status).toBe(200);
    const pBody = (await tablesPrimary.json()) as { tables: string[] };
    expect(pBody.tables).not.toContain("orders_a");

    const missing = await app.request("/schema/tables", {
      headers: adminHeaders({ "X-Jord-Project": "no-such-project" }),
    });
    expect(missing.status).toBe(404);
  });

  it("keeps /admin/projects on the primary even with a project header", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "jord-plane-cp-"));
    temps.push(dir);
    const primary = await createJordClient({
      url: fsPathToFileUrl(path.join(dir, "primary.db")),
    });
    const app = createJordApp({
      jord: primary,
      enqueueWrite: createWriteQueue(),
      auth: AUTH,
      secrets: createAesGcmSecretPort({ masterKey: randomBytes(32) }),
    });

    const create = await app.request("/admin/projects", {
      method: "POST",
      headers: adminHeaders({ "X-Jord-Project": "ghost" }),
      body: JSON.stringify({
        slug: "real",
        engine: "libsql-file",
        target: path.join(dir, "real.db"),
      }),
    });
    expect(create.status).toBe(201);

    const list = await app.request("/admin/projects", {
      headers: adminHeaders({ "X-Jord-Project": "ghost" }),
    });
    expect(list.status).toBe(200);
    const body = (await list.json()) as { projects: Array<{ slug: string }> };
    expect(body.projects.map((p) => p.slug)).toContain("real");
  });
});
