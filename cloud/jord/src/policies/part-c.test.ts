import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { createJordClient, fsPathToFileUrl } from "@altr/jord";
import { afterEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { ConsoleMailer } from "../auth/mailer.js";
import { assertPostgresMigrateUrl } from "../auth/pg-url.js";
import { surfaceFor, undeclared } from "../auth/route-inventory.js";
import { signSessionToken } from "../auth/token.js";
import { createWriteQueue } from "../queue.js";

const temps: string[] = [];

const JWT = "jwt-current-secret";
const JWT_PREV = "jwt-previous-secret";

const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: JWT_PREV,
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

async function boot() {
  const dir = await mkdtemp(path.join(tmpdir(), "jord-part-c-"));
  temps.push(dir);
  const jord = await createJordClient({
    url: fsPathToFileUrl(path.join(dir, "jord.db")),
  });
  const mailer = new ConsoleMailer();
  const app = createJordApp({
    jord,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer,
  });
  return { app, jord, mailer, auth: AUTH };
}

function bearer(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function userToken(): string {
  return signAccessToken({
    secret: JWT,
    iss: "jord",
    aud: "jord",
    sub: "user-1",
    role: "user",
  }).token;
}

function adminToken(): string {
  return signSessionToken("admin", AUTH.secret);
}

const MOUNTED: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/auth/signup" },
  { method: "GET", path: "/auth/me" },
  { method: "GET", path: "/records" },
  { method: "POST", path: "/records" },
  { method: "GET", path: "/records/abc" },
  { method: "GET", path: "/schema/tables" },
  { method: "GET", path: "/schema/tables/notes" },
  { method: "GET", path: "/schema/tables/notes/rows" },
  { method: "POST", path: "/schema/tables/notes/rows" },
  { method: "PATCH", path: "/schema/tables/notes/rows/1" },
  { method: "DELETE", path: "/schema/tables/notes/rows/1" },
  { method: "POST", path: "/schema/tables" },
  { method: "PUT", path: "/schema/tables/records/rls" },
  { method: "POST", path: "/schema/tables/records/columns" },
  { method: "GET", path: "/apis/generated" },
  { method: "GET", path: "/jobs" },
  { method: "GET", path: "/logs" },
  { method: "GET", path: "/functions" },
  { method: "GET", path: "/custom-apis" },
  { method: "POST", path: "/x/echo" },
  { method: "GET", path: "/policies" },
  { method: "GET", path: "/triggers" },
  { method: "GET", path: "/realtime" },
  { method: "GET", path: "/realtime/ws" },
  { method: "GET", path: "/blobs/buckets" },
  { method: "GET", path: "/vectors/namespaces" },
  { method: "GET", path: "/api/v1" },
  { method: "GET", path: "/api/v1/records" },
];

describe("S0021-C server enforcement", () => {
  it("denies a user access token on GET /records when RLS is off", async () => {
    const ctx = await boot();
    try {
      const denied = await ctx.app.request("/records", {
        headers: bearer(userToken()),
      });
      expect(denied.status).toBe(403);
      expect(await denied.json()).toMatchObject({ error: "policy_denied" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("allows a user select after RLS is enabled and an allow policy matches", async () => {
    const ctx = await boot();
    try {
      const admin = adminToken();
      const enabled = await ctx.app.request("/schema/tables/records/rls", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({ rls_enabled: true }),
      });
      expect(enabled.status).toBe(200);

      const policy = await ctx.app.request("/policies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          name: "users may select",
          table_name: "records",
          operation: "select",
          effect: "allow",
          rules: JSON.stringify([
            { kind: "role_in", config: { roles: ["user"] } },
          ]),
        }),
      });
      expect(policy.status).toBe(201);

      const list = await ctx.app.request("/records?bucket=lab", {
        headers: bearer(userToken()),
      });
      expect(list.status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("lets a matching deny override a matching allow", async () => {
    const ctx = await boot();
    try {
      const admin = adminToken();
      const enabled = await ctx.app.request("/schema/tables/records/rls", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({ rls_enabled: true }),
      });
      expect(enabled.status).toBe(200);

      const allow = await ctx.app.request("/policies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          name: "users may select",
          table_name: "records",
          operation: "select",
          effect: "allow",
          priority: 100,
          rules: JSON.stringify([
            { kind: "role_in", config: { roles: ["user"] } },
          ]),
        }),
      });
      expect(allow.status).toBe(201);

      const deny = await ctx.app.request("/policies", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          name: "users may not select",
          table_name: "records",
          operation: "select",
          effect: "deny",
          priority: 1,
          rules: JSON.stringify([
            { kind: "role_in", config: { roles: ["user"] } },
          ]),
        }),
      });
      expect(deny.status).toBe(201);
      const denyBody = (await deny.json()) as { id: string };

      const list = await ctx.app.request("/records?bucket=lab", {
        headers: bearer(userToken()),
      });
      expect(list.status).toBe(403);
      expect(await list.json()).toMatchObject({
        error: "policy_denied",
        policyId: denyBody.id,
      });
    } finally {
      await ctx.jord.close();
    }
  });

  it("fails the inventory on an undeclared route and accepts mounted paths", () => {
    expect(undeclared([{ method: "GET", path: "/secret-extra" }]).length).toBeGreaterThan(
      0,
    );
    expect(surfaceFor("PUT", "/schema/tables/records/rls")).toBe("schema DDL");
    expect(surfaceFor("GET", "/api/v1")).toBe("api/v1");
    for (const route of MOUNTED) {
      expect(surfaceFor(route.method, route.path), `${route.method} ${route.path}`).not.toBeNull();
    }
    expect(undeclared(MOUNTED)).toEqual([]);
  });

  it("still lets the service raw bearer insert a record", async () => {
    const ctx = await boot();
    try {
      const created = await ctx.app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(AUTH.secret),
        },
        body: JSON.stringify({ bucket: "lab", body: "{}" }),
      });
      expect(created.status).toBe(201);
    } finally {
      await ctx.jord.close();
    }
  });

  it("refuses a non-service update that changes the owner column", async () => {
    const ctx = await boot();
    try {
      const admin = adminToken();
      const created = await ctx.app.request("/schema/tables", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          name: "lab_notes",
          columns: [
            { name: "title", type: "TEXT" },
            { name: "owner_id", type: "TEXT" },
          ],
        }),
      });
      expect(created.status).toBe(201);

      const enabled = await ctx.app.request("/schema/tables/lab_notes/rls", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...bearer(admin),
        },
        body: JSON.stringify({
          rls_enabled: true,
          owner_column: "owner_id",
        }),
      });
      expect(enabled.status).toBe(200);

      for (const operation of ["insert", "update"] as const) {
        const policy = await ctx.app.request("/policies", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...bearer(admin),
          },
          body: JSON.stringify({
            name: `owner ${operation}`,
            table_name: "lab_notes",
            operation,
            effect: "allow",
            rules: JSON.stringify([
              { kind: "owner_eq", config: { column: "owner_id" } },
            ]),
          }),
        });
        expect(policy.status).toBe(201);
      }

      const inserted = await ctx.app.request("/schema/tables/lab_notes/rows", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(userToken()),
        },
        body: JSON.stringify({
          values: { id: "1", title: "mine", owner_id: "other" },
        }),
      });
      expect(inserted.status).toBe(201);

      const stolen = await ctx.app.request("/schema/tables/lab_notes/rows/1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...bearer(userToken()),
        },
        body: JSON.stringify({ values: { owner_id: "other" } }),
      });
      expect(stolen.status).toBe(403);
      expect(await stolen.json()).toMatchObject({ reason: "owner_changed" });
    } finally {
      await ctx.jord.close();
    }
  });

  it("still accepts an HMAC admin operator token", async () => {
    const ctx = await boot();
    try {
      const created = await ctx.app.request("/records", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...bearer(adminToken()),
        },
        body: JSON.stringify({ bucket: "lab", body: "{\"n\":1}" }),
      });
      expect(created.status).toBe(201);
      const list = await ctx.app.request("/records?bucket=lab", {
        headers: bearer(adminToken()),
      });
      expect(list.status).toBe(200);
    } finally {
      await ctx.jord.close();
    }
  });

  it("refuses a postgres runtime URL without a distinct migrate URL", () => {
    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgres://jord_app@localhost:5432/jord",
      }),
    ).toThrow(/JORD_MIGRATE_URL/);

    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgresql://jord_app@localhost/jord",
        JORD_MIGRATE_URL:
          "postgres://jord_app:secret@localhost:5432/jord?sslmode=require",
      }),
    ).toThrow(/same connection/);

    expect(() =>
      assertPostgresMigrateUrl({ DATABASE_URL: "file:./jord.db" }),
    ).not.toThrow();
    expect(() =>
      assertPostgresMigrateUrl({ DATABASE_URL: "libsql://example.turso.io" }),
    ).not.toThrow();
    expect(() =>
      assertPostgresMigrateUrl({
        DATABASE_URL: "postgres://jord_app@localhost/jord",
        JORD_MIGRATE_URL: "postgres://owner@localhost/jord",
      }),
    ).not.toThrow();
  });
});
