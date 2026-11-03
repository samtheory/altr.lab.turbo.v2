import { AsyncLocalStorage } from "node:async_hooks";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createJordApp } from "../app.js";
import type { JordAuthConfig } from "../auth/config.js";
import { signAccessToken } from "../auth/jwt.js";
import { ConsoleMailer } from "../auth/mailer.js";
import { createSession } from "../auth/sessions.js";
import { signSessionToken } from "../auth/token.js";
import type { RateLimitStore } from "../http/rate-limit-store.js";
import { createWriteQueue } from "../queue.js";
import { openTestDb, TEST_BACKENDS, type TestBackend, type TestDb } from "../testing/harness.js";
import { decideForPrincipal, type DecisionPrincipal } from "./evaluate.js";
import { runUnderRlsSession, type PolicyEvaluateResult } from "./evaluate-routes.js";

const JWT = "jwt-current-secret";
const AUTH: JordAuthConfig = {
  secret: "test-jord-server-token",
  defaultRole: "admin",
  legacyMode: "service",
  jwtSecret: JWT,
  jwtSecretPrevious: null,
  jwtIss: "jord",
  jwtAud: "jord",
};
const json = { "content-type": "application/json" };
const admin = () => ({ ...json, authorization: `Bearer ${signSessionToken("admin", AUTH.secret)}` });
const bearer = (token: string) => ({ ...json, authorization: `Bearer ${token}` });
const NO_LIMIT: RateLimitStore = { hit: () => 1 };

const open: TestDb[] = [];
afterEach(async () => {
  while (open.length > 0) await open.pop()?.close();
});

let backend: TestBackend = "file";

async function boot(rateLimit?: RateLimitStore) {
  const db = await openTestDb(backend);
  open.push(db);
  const app = createJordApp({
    jord: db.jord,
    ddl: db.ddl,
    enqueueWrite: createWriteQueue(),
    auth: AUTH,
    mailer: new ConsoleMailer(),
    ...(rateLimit ? { rateLimit } : {}),
  });
  return { app, jord: db.jord };
}
type Ctx = Awaited<ReturnType<typeof boot>>;

type Rule = { kind: string; config?: Record<string, unknown> };
const OPS = ["select", "insert", "update", "delete"] as const;

async function req(ctx: Ctx, path: string, init: { method?: string; headers: Record<string, string>; body?: unknown }) {
  return ctx.app.request(path, {
    method: init.method ?? "GET",
    headers: init.headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
}

async function makeTable(ctx: Ctx, name: string, rls: boolean, policies: Array<{ effect: "allow" | "deny"; rules: Rule[] }>) {
  const created = await req(ctx, "/schema/tables", {
    method: "POST",
    headers: admin(),
    body: {
      name,
      columns: [
        { name: "title", type: "TEXT" },
        { name: "owner_id", type: "TEXT" },
        { name: "owner_email", type: "TEXT" },
      ],
    },
  });
  expect(created.status).toBe(201);
  if (rls) {
    const flag = await req(ctx, `/schema/tables/${name}/rls`, {
      method: "PUT",
      headers: admin(),
      body: { rls_enabled: true, owner_column: "owner_id" },
    });
    expect(flag.status).toBe(200);
  }
  for (const [i, policy] of policies.entries()) {
    for (const operation of OPS) {
      const res = await req(ctx, "/policies", {
        method: "POST",
        headers: admin(),
        body: { name: `${policy.effect} ${i} ${operation}`, table_name: name, operation, effect: policy.effect, rules: JSON.stringify(policy.rules) },
      });
      expect(res.status).toBe(201);
    }
  }
}

async function seed(ctx: Ctx, table: string, rows: Array<[string, string, string]>) {
  for (const [id, owner, email] of rows) {
    const res = await req(ctx, `/schema/tables/${table}/rows`, {
      method: "POST",
      headers: admin(),
      body: { values: { id, title: `t${id}`, owner_id: owner, owner_email: email } },
    });
    expect(res.status).toBe(201);
  }
}

async function signup(ctx: Ctx, email: string): Promise<string> {
  await req(ctx, "/auth/signup", { method: "POST", headers: json, body: { email, password: "correct-horse-battery" } });
  const rows = await ctx.jord.query("SELECT id FROM jord_users WHERE email = ?".replace("?", ctx.jord.dialect === "postgres" ? "$1" : "?"), [email]);
  expect(rows).toHaveLength(1);
  return String(rows[0]!.id);
}

type Who = {
  label: string;
  body: Record<string, unknown>;
  token: string;
  principal: DecisionPrincipal;
};

function userWho(label: string, uid: string, email: string): Who {
  return {
    label,
    body: { principalId: uid },
    token: signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub: uid, role: "user", email }).token,
    // Exactly what token.ts builds for that JWT on the request path.
    principal: { kind: "user", uid, role: "user", claims: { iss: "jord", aud: "jord", sub: uid, email } },
  };
}

const anonWho: Who = {
  label: "anon",
  body: { role: "anon", principalId: "ignored" },
  token: signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub: "anon", role: "anon" }).token,
  principal: { kind: "anon", role: "anon", claims: { iss: "jord", aud: "jord" } },
};

async function evaluate(ctx: Ctx, body: Record<string, unknown>, headers = admin()) {
  return req(ctx, "/admin/policies/evaluate", { method: "POST", headers, body });
}

async function evaluateOk(ctx: Ctx, body: Record<string, unknown>): Promise<PolicyEvaluateResult> {
  const res = await evaluate(ctx, body);
  expect(res.status, JSON.stringify(body)).toBe(200);
  return (await res.json()) as PolicyEvaluateResult;
}

const TABLES = ["p_allow", "p_deny", "p_owner", "p_claim", "p_none", "p_norls"] as const;

async function fixture(ctx: Ctx) {
  const u1 = await signup(ctx, "a@x.test");
  const u2 = await signup(ctx, "b@x.test");
  await makeTable(ctx, "p_allow", true, [{ effect: "allow", rules: [{ kind: "role_in", config: { roles: ["user"] } }] }]);
  await makeTable(ctx, "p_deny", true, [
    { effect: "allow", rules: [{ kind: "always" }] },
    { effect: "deny", rules: [{ kind: "role_in", config: { roles: ["user"] } }] },
  ]);
  await makeTable(ctx, "p_owner", true, [{ effect: "allow", rules: [{ kind: "owner_eq", config: { column: "owner_id" } }] }]);
  await makeTable(ctx, "p_claim", true, [
    { effect: "allow", rules: [{ kind: "claim_eq", config: { claim: "email", column: "owner_email" } }] },
  ]);
  await makeTable(ctx, "p_none", true, []);
  await makeTable(ctx, "p_norls", false, [{ effect: "allow", rules: [{ kind: "always" }] }]);
  for (const table of TABLES) {
    await seed(ctx, table, [
      ["1", u1, "a@x.test"],
      ["2", u2, "b@x.test"],
      ["3", u1, "a@x.test"],
    ]);
  }
  return { u1, u2, whos: [userWho("u1", u1, "a@x.test"), userWho("u2", u2, "b@x.test"), anonWho] };
}

/** Endpoint vs direct `decideForPrincipal` for the table-level decision. */
async function assertDirectParity(ctx: Ctx, who: Who, table: string, operation: (typeof OPS)[number], ev: PolicyEvaluateResult) {
  const direct = await decideForPrincipal({ jord: ctx.jord, principal: who.principal, tableName: table, operation });
  const tag = `${who.label} ${operation} ${table}`;
  expect(ev.principal.kind, tag).toBe(who.principal.kind);
  expect(ev.principal.uid, tag).toBe(who.principal.uid ?? null);
  expect(ev.principal.claims, tag).toEqual(who.principal.claims);
  if (!direct.allowed) expect(ev.allowed, tag).toBe(false);
  const directPolicy = direct.allowed ? direct.matched : direct.policy;
  expect(ev.matchedPolicy?.id ?? null, tag).toBe(directPolicy?.id ?? null);
  return direct;
}

describe.each(TEST_BACKENDS)("S0077 POST /admin/policies/evaluate (%s)", (name) => {
  beforeEach(() => {
    backend = name;
  });

  it("matches the evaluator and the real HTTP request across the fixture matrix", async () => {
    const ctx = await boot(NO_LIMIT);
    const { whos } = await fixture(ctx);
    let checks = 0;

    // select: any row (count) and each row.
    for (const table of TABLES) {
      for (const who of whos) {
        const ev = await evaluateOk(ctx, { ...who.body, operation: "select", table });
        const direct = await assertDirectParity(ctx, who, table, "select", ev);
        expect(ev.allowed).toBe(direct.allowed);
        expect(ev.rowAllowed).toBeNull();
        const http = await req(ctx, `/api/v1/${table}`, { headers: { ...bearer(who.token), prefer: "count=exact" } });
        expect(http.status, `${who.label} GET ${table}`).toBe(ev.allowed ? 200 : 403);
        if (http.status === 200) {
          const body = (await http.json()) as { count: number };
          expect(body.count, `${who.label} count ${table}`).toBe(ev.rowCount);
        } else {
          expect(ev.rowCount).toBe(0);
        }
        expect(ev.rowsEvaluated).toBe(3);
        checks++;
        for (const id of ["1", "2", "3"]) {
          const one = await evaluateOk(ctx, { ...who.body, operation: "select", table, row: { id } });
          await assertDirectParity(ctx, who, table, "select", one);
          const res = await req(ctx, `/api/v1/${table}?id=eq.${id}`, { headers: bearer(who.token) });
          expect(res.status).toBe(direct.allowed ? 200 : 403);
          const visible = res.status === 200 && ((await res.json()) as { data: unknown[] }).data.length === 1;
          expect(one.allowed, `${who.label} select ${table} row ${id}`).toBe(visible);
          expect(one.rowAllowed).toBe(visible);
          if (direct.allowed && !visible) expect(one.reason).toBe("row_outside_scope");
          checks++;
        }
      }
    }

    // update: every row (title only; never moves scope).
    for (const table of TABLES) {
      for (const who of whos) {
        for (const id of ["1", "2", "3"]) {
          const ev = await evaluateOk(ctx, { ...who.body, operation: "update", table, row: { id }, values: { title: "x" } });
          const direct = await assertDirectParity(ctx, who, table, "update", ev);
          const res = await req(ctx, `/api/v1/${table}?pk=${id}`, { method: "PATCH", headers: bearer(who.token), body: { title: "x" } });
          expect(res.status).toBe(direct.allowed ? 200 : 403);
          const affected = res.status === 200 ? ((await res.json()) as { affected: number }).affected : 0;
          expect(ev.allowed, `${who.label} update ${table} row ${id}`).toBe(affected === 1);
          checks++;
        }
      }
    }

    // insert: candidate values; the server stamps scope columns like POST does.
    let next = 100;
    for (const table of TABLES) {
      for (const who of whos) {
        const values = { id: String(next++), title: "new" };
        const ev = await evaluateOk(ctx, { ...who.body, operation: "insert", table, values });
        const direct = await assertDirectParity(ctx, who, table, "insert", ev);
        const res = await req(ctx, `/api/v1/${table}`, { method: "POST", headers: bearer(who.token), body: values });
        expect([201, 403]).toContain(res.status);
        expect(ev.allowed, `${who.label} insert ${table}`).toBe(res.status === 201);
        if (!direct.allowed) expect(res.status).toBe(403);
        checks++;
      }
    }

    // delete last: each evaluation runs right before its real DELETE.
    for (const table of TABLES) {
      for (const who of whos) {
        for (const id of ["1", "2", "3"]) {
          const raw = await evaluate(ctx, { ...who.body, operation: "delete", table, row: { id } });
          if (raw.status === 404) {
            expect(((await raw.json()) as { error: string }).error).toBe("row_not_found");
            continue;
          }
          const ev = (await raw.json()) as PolicyEvaluateResult;
          const direct = await assertDirectParity(ctx, who, table, "delete", ev);
          const res = await req(ctx, `/api/v1/${table}?pk=${id}`, { method: "DELETE", headers: bearer(who.token) });
          expect(res.status).toBe(direct.allowed ? 200 : 403);
          const affected = res.status === 200 ? ((await res.json()) as { affected: number }).affected : 0;
          expect(ev.allowed, `${who.label} delete ${table} row ${id}`).toBe(affected === 1);
          checks++;
        }
      }
    }
    expect(checks).toBeGreaterThan(150);
  }, 60_000); // 150+ checks incl. real HTTP calls; the default 5 s flakes under full-suite load

  it("explains decisions: reasons, matched policy, row scope, patch out of scope", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1, u2, whos } = await fixture(ctx);
    const u1Body = whos[0]!.body;

    const owner = await evaluateOk(ctx, { ...u1Body, operation: "select", table: "p_owner" });
    expect(owner).toMatchObject({
      allowed: true,
      operation: "select",
      table: "p_owner",
      reason: "allowed_by_policy",
      rowScope: { anyOf: [{ column: "owner_id", equals: u1 }], lossy: false },
      rowCount: 2,
      rowsEvaluated: 3,
      rowAllowed: null,
      matchedPolicy: {
        effect: "allow",
        kind: "owner_eq",
        name: "allow 0 select",
        plainLanguage: "Allow select on p_owner when owner_id equals the caller id",
      },
    });
    expect(JSON.parse(owner.matchedPolicy!.expression)).toEqual([{ kind: "owner_eq", config: { column: "owner_id" } }]);

    expect((await evaluateOk(ctx, { ...u1Body, operation: "select", table: "p_deny" })).reason).toBe("denied_by_policy");
    expect((await evaluateOk(ctx, { ...u1Body, operation: "select", table: "p_none" })).reason).toBe(
      "no_matching_policy_default_deny",
    );
    const norls = await evaluateOk(ctx, { ...u1Body, operation: "select", table: "p_norls" });
    expect(norls).toMatchObject({ allowed: false, reason: "rls_disabled_default_deny", matchedPolicy: null });

    const outside = await evaluateOk(ctx, { ...u1Body, operation: "select", table: "p_owner", row: { id: "2" } });
    expect(outside).toMatchObject({ allowed: false, rowAllowed: false, reason: "row_outside_scope" });

    // A patch that hands the row to someone else: tester and PATCH both refuse.
    const moved = await evaluateOk(ctx, { ...u1Body, operation: "update", table: "p_owner", row: { id: "1" }, values: { owner_id: u2 } });
    expect(moved).toMatchObject({ allowed: false, rowAllowed: true, reason: "patch_moves_row_out_of_scope" });
    const patch = await req(ctx, "/api/v1/p_owner?pk=1", { method: "PATCH", headers: bearer(whos[0]!.token), body: { owner_id: u2 } });
    expect(patch.status).toBe(403);

    // anon ignores principalId and carries no uid.
    const anon = await evaluateOk(ctx, { role: "anon", principalId: u1, operation: "select", table: "p_deny" });
    expect(anon).toMatchObject({ allowed: true, principal: { kind: "anon", uid: null }, matchedPolicy: { kind: "always" } });
    expect(anon.principal.claims).toEqual({ iss: "jord", aud: "jord" });
  });

  it("headline ignores caller claims; non-reserved claims replay only in the advisory hypothetical", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1 } = await fixture(ctx);
    const base = { principalId: u1, operation: "select", table: "p_claim", row: { id: "2" } };

    const plain = await evaluateOk(ctx, base);
    expect(plain).toMatchObject({ allowed: false, reason: "row_outside_scope", ignoredClaims: [], hypothetical: null });
    expect(typeof plain.hypotheticalNote).toBe("string");

    const swapped = await evaluateOk(ctx, {
      ...base,
      claims: { email: "b@x.test", tenant: "acme", sub: "spoofed", role: "service", sid: "x", exp: 1, iat: 1, iss: "evil", aud: "evil" },
    });
    // Headline = what a real token for u1 gets: the caller's email (and everything else) is ignored.
    expect(swapped).toMatchObject({
      allowed: false,
      rowAllowed: false,
      reason: "row_outside_scope",
      rowCount: 2,
      rowScope: { anyOf: [{ column: "owner_email", equals: "a@x.test" }], lossy: false },
    });
    expect(swapped.principal).toMatchObject({ kind: "user", uid: u1, claims: { iss: "jord", aud: "jord", sub: u1, email: "a@x.test" } });
    expect([...swapped.ignoredClaims].sort()).toEqual(["aud", "email", "exp", "iat", "iss", "role", "sid", "sub", "tenant"]);
    // Hypothetical replays email + tenant only, and differs from the headline.
    expect(swapped.hypothetical).toMatchObject({ allowed: true, rowAllowed: true, rowCount: 1, reason: "allowed_by_policy" });
    expect(swapped.hypothetical!.matchedPolicy?.kind).toBe("claim_eq");
    expect(JSON.stringify(swapped)).not.toContain("acme");

    // Only reserved claims: nothing to replay.
    const reservedOnly = await evaluateOk(ctx, { ...base, claims: { sub: "spoofed", role: "service" } });
    expect(reservedOnly.hypothetical).toBeNull();
    expect([...reservedOnly.ignoredClaims].sort()).toEqual(["role", "sub"]);

    // Production agrees with the headline: u1's real token cannot see row 2.
    const token = signAccessToken({ secret: JWT, iss: "jord", aud: "jord", sub: u1, role: "user", email: "a@x.test" }).token;
    const res = await req(ctx, "/api/v1/p_claim?id=eq.2", { headers: bearer(token) });
    expect(((await res.json()) as { data: unknown[] }).data).toHaveLength(0);
  });

  it("rowScope lists every allow-policy scope term; AND-ed terms are lossy", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1 } = await fixture(ctx);
    await makeTable(ctx, "p_two", true, [
      { effect: "allow", rules: [{ kind: "owner_eq", config: { column: "owner_id" } }] },
      { effect: "allow", rules: [{ kind: "claim_eq", config: { claim: "email", column: "owner_email" } }] },
    ]);
    const two = await evaluateOk(ctx, { principalId: u1, operation: "select", table: "p_two" });
    expect(two.allowed).toBe(true);
    expect(two.rowScope!.lossy).toBe(false);
    expect(two.rowScope!.anyOf).toHaveLength(2);
    expect(two.rowScope!.anyOf).toEqual(
      expect.arrayContaining([
        { column: "owner_id", equals: u1 },
        { column: "owner_email", equals: "a@x.test" },
      ]),
    );
    await makeTable(ctx, "p_and", true, [
      {
        effect: "allow",
        rules: [
          { kind: "owner_eq", config: { column: "owner_id" } },
          { kind: "claim_eq", config: { claim: "email", column: "owner_email" } },
        ],
      },
    ]);
    const and = await evaluateOk(ctx, { principalId: u1, operation: "select", table: "p_and" });
    expect(and.rowScope).toMatchObject({ lossy: true });
    expect(and.rowScope!.anyOf).toHaveLength(2);
  });

  it("reports userStatus; a disabled user is user_disabled with no matched policy", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1 } = await fixture(ctx);
    const sql = (text: string) => {
      let i = 0;
      return ctx.jord.dialect === "postgres" ? text.replace(/\?/g, () => `$${++i}`) : text;
    };
    const userRow = (await ctx.jord.query(sql("SELECT email_confirmed FROM jord_users WHERE id = ?"), [u1]))[0]!;

    await ctx.jord.query(sql("UPDATE jord_sessions SET revoked_at = ? WHERE user_id = ?"), [Date.now(), u1]);
    const noSession = await evaluateOk(ctx, { principalId: u1, operation: "select", table: "p_allow" });
    expect(noSession.principal.userStatus).toEqual({
      disabled: false,
      emailConfirmed: Boolean(userRow.email_confirmed),
      hasLiveSession: false,
    });
    expect(noSession).toMatchObject({ allowed: true, reason: "allowed_by_policy" });

    await createSession({ jord: ctx.jord, id: "sess-live-1", userId: u1 });
    const live = await evaluateOk(ctx, { principalId: u1, operation: "select", table: "p_allow" });
    expect(live.principal.userStatus?.hasLiveSession).toBe(true);

    const anon = await evaluateOk(ctx, { role: "anon", operation: "select", table: "p_allow" });
    expect(anon.principal.userStatus).toBeNull();

    await ctx.jord.query(sql("UPDATE jord_users SET disabled_at = ? WHERE id = ?"), [Date.now(), u1]);
    const banned = await evaluateOk(ctx, { principalId: u1, operation: "select", table: "p_allow", claims: { tenant: "t" } });
    expect(banned).toMatchObject({
      allowed: false,
      reason: "user_disabled",
      matchedPolicy: null,
      rowScope: null,
      principal: { userStatus: { disabled: true } },
      hypothetical: { allowed: false, reason: "user_disabled" },
    });
  });

  it("applies the table API's records 503 gate", async () => {
    const ctx = await boot(NO_LIMIT);
    const off = await req(ctx, "/apis/generated/records", { method: "PATCH", headers: admin(), body: { enabled: false } });
    expect(off.status).toBe(200);
    const res = await evaluate(ctx, { role: "anon", operation: "select", table: "records" });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("api_disabled");
  });

  it("rejects a chunked body over 64 KiB without trusting Content-Length", async () => {
    const ctx = await boot(NO_LIMIT);
    const chunk = new TextEncoder().encode(" ".repeat(16 * 1024));
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= 6) {
          controller.enqueue(new TextEncoder().encode('{"role":"anon","operation":"select","table":"x"}'));
          controller.close();
          return;
        }
        sent++;
        controller.enqueue(chunk);
      },
    });
    const res = await ctx.app.request("/admin/policies/evaluate", {
      method: "POST",
      headers: admin(),
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: string }).error).toBe("payload_too_large");
  });

  it("fails closed when the limiter throws, and keys uid-less operators per bearer", async () => {
    const broken: RateLimitStore = {
      hit: (key) => {
        if (key.startsWith("admin:policy-evaluate")) throw new Error("store down");
        return 1;
      },
    };
    const ctx = await boot(broken);
    await makeTable(ctx, "p_lim", true, []);
    const res = await evaluate(ctx, { role: "anon", operation: "select", table: "p_lim" });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("rate_limit_unavailable");

    const keys: string[] = [];
    const spy: RateLimitStore = {
      hit: (key) => {
        if (key.startsWith("admin:policy-evaluate")) keys.push(key);
        return 1;
      },
    };
    const ctx2 = await boot(spy);
    await makeTable(ctx2, "p_lim", true, []);
    const now = Date.now();
    const a = { ...json, authorization: `Bearer ${signSessionToken("admin", AUTH.secret, 60_000, now)}` };
    const b = { ...json, authorization: `Bearer ${signSessionToken("admin", AUTH.secret, 60_000, now + 1)}` };
    expect((await evaluate(ctx2, { role: "anon", operation: "select", table: "p_lim" }, a)).status).toBe(200);
    expect((await evaluate(ctx2, { role: "anon", operation: "select", table: "p_lim" }, b)).status).toBe(200);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^admin:policy-evaluate:role:admin:[0-9a-f]{32}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it("is admin only, validates input, and never writes data or mints sessions", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1, whos } = await fixture(ctx);
    const body = { principalId: u1, operation: "select", table: "p_allow" };

    expect((await evaluate(ctx, body, bearer(whos[0]!.token))).status).toBe(403);
    expect((await evaluate(ctx, body, bearer(anonWho.token))).status).toBe(403);
    const editor = { ...json, authorization: `Bearer ${signSessionToken("editor", AUTH.secret)}` };
    expect((await evaluate(ctx, body, editor)).status).toBe(403);

    const expectError = async (b: Record<string, unknown>, status: number, error: string) => {
      const res = await evaluate(ctx, b);
      expect(res.status, JSON.stringify(b)).toBe(status);
      expect(((await res.json()) as { error: string }).error).toBe(error);
    };
    await expectError({ ...body, principalId: "nobody" }, 404, "unknown_user");
    await expectError({ ...body, table: "missing_table" }, 404, "unknown_table");
    await expectError({ ...body, table: "jord_users" }, 404, "table_not_exposed");
    await expectError({ ...body, row: { id: "999" } }, 404, "row_not_found");
    await expectError({ ...body, row: { title: "t1" } }, 400, "invalid_request");
    await expectError({ ...body, row: { id: "1", title: "t1" } }, 400, "invalid_request");
    await expectError({ ...body, operation: "truncate" }, 400, "invalid_request");
    await expectError({ ...body, table: "p_allow; DROP TABLE x" }, 400, "invalid_request");
    await expectError({ ...body, role: "service" }, 400, "invalid_request");
    await expectError({ ...body, role: "user", principalId: undefined }, 400, "invalid_request");
    await expectError({ ...body, schema: "nope_schema" }, 400, "invalid_request");
    await expectError({ ...body, values: { not_a_column: 1 } }, 400, "invalid_request");

    const snapshot = async () => ({
      rows: await ctx.jord.query('SELECT id, title, owner_id, owner_email FROM "p_allow" ORDER BY id'),
      sessions: await ctx.jord.query("SELECT COUNT(*) AS n FROM jord_sessions"),
    });
    const before = await snapshot();
    for (const operation of OPS) {
      await evaluateOk(ctx, { principalId: u1, operation, table: "p_allow", row: { id: "1" }, values: { id: "50", title: "changed" } });
    }
    expect(await snapshot()).toEqual(before);
  });

  it("audits who tested whom without row or claim values", async () => {
    const ctx = await boot(NO_LIMIT);
    const { u1 } = await fixture(ctx);
    await evaluateOk(ctx, {
      principalId: u1,
      claims: { tenant: "SECRET-CLAIM-VALUE" },
      operation: "update",
      table: "p_owner",
      row: { id: "3" },
      values: { title: "SECRET-ROW-VALUE" },
    });
    const logs = await ctx.jord.query(
      "SELECT source, message, meta_json FROM jord_logs WHERE source = 'policies.evaluate'",
    );
    expect(logs).toHaveLength(1);
    const meta = JSON.parse(String(logs[0]!.meta_json)) as Record<string, unknown>;
    expect(meta).toMatchObject({
      actor: "admin",
      action: "evaluate",
      principalKind: "user",
      principalId: u1,
      table: "p_owner",
      operation: "update",
      allowed: true,
      claimOverrides: 1,
      rowGiven: true,
    });
    const text = JSON.stringify(logs);
    expect(text).not.toContain("SECRET-CLAIM-VALUE");
    expect(text).not.toContain("SECRET-ROW-VALUE");
    expect(text).not.toContain("a@x.test");
  });

  it("rate limits to 30 evaluations per actor per minute", async () => {
    const ctx = await boot();
    await makeTable(ctx, "p_rate", true, []);
    const body = { role: "anon", operation: "select", table: "p_rate" };
    // Uid-less operators are keyed per bearer, so reuse one token.
    const headers = admin();
    for (let i = 0; i < 30; i++) {
      expect((await evaluate(ctx, body, headers)).status).toBe(200);
    }
    const limited = await evaluate(ctx, body, headers);
    expect(limited.status).toBe(429);
    expect(((await limited.json()) as { error: string }).error).toBe("rate_limited");
  });
});

describe("S0077 runUnderRlsSession", () => {
  it("binds the simulated session inside the scope and restores the caller's after", async () => {
    const store = new AsyncLocalStorage<{ role: string; uid: string }>();
    const fake = {
      bindRlsSession: (input: { role: string; uid?: string | null }) =>
        store.enterWith({ role: input.role, uid: input.uid ?? "" }),
    };
    fake.bindRlsSession({ role: "admin" });
    const seen = await runUnderRlsSession(fake, { kind: "user", role: "user", uid: "u-9", claims: {} }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return store.getStore();
    });
    expect(seen).toEqual({ role: "user", uid: "u-9" });
    expect(store.getStore()).toEqual({ role: "admin", uid: "" });
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(store.getStore()).toEqual({ role: "admin", uid: "" });
  });
});
