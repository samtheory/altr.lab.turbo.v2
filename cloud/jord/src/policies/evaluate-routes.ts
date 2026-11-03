/**
 * S0077 — `POST /admin/policies/evaluate`: "run as user" policy tester.
 *
 * Read-only. The decision comes from `decideForPrincipal` (the same call
 * `/api/v1/:table` makes, reading the same env: `process.env`); row checks use
 * the table API's own scope SQL (`scopeFor` + `compileSelect` / `compileCount`
 * + `filtersForWrite`) and the production `stampInsertScope` /
 * `patchKeepsScope`. No DML, no token minting.
 *
 * The headline result uses the principal production would build from a real
 * token (`resolvePrincipalWithKeys`): user = iss/aud/sub/email (no sid),
 * anon = iss/aud. Caller `claims` never change the headline; they are listed
 * in `ignoredClaims` and, when non-reserved, replayed in an advisory
 * `hypothetical` block (production cannot mint such a token today).
 *
 * Postgres: scoped counts and row checks run under the simulated principal's
 * RLS session (`bindRlsSession`, the same GUCs the request middleware sets), in
 * an isolated async scope so the admin's session is untouched afterwards.
 */
import { createHash } from "node:crypto";
import { AsyncResource } from "node:async_hooks";

import {
  isValidSqlIdent,
  type JordDriverPort,
  type JordPolicy,
  type JordPolicyOperation,
  type JordTableInfo,
} from "@altr/jord";
import { Hono } from "hono";

import { getAdminUser } from "../auth/admin.js";
import { RESERVED_JWT_CLAIMS } from "../auth/jwt.js";
import { auditKeyEvent } from "../auth/key-sets.js";
import type { JordAuthVariables } from "../auth/middleware.js";
import { listSessions } from "../auth/sessions.js";
import type { RateLimitStore } from "../http/rate-limit-store.js";
import { readJsonCapped } from "../table-api/body.js";
import { pkColumns, TableApiError, type Filter, type ParsedTableQuery } from "../table-api/query.js";
import { RESERVED } from "../table-api/routes.js";
import {
  compileCount,
  compileSelect,
  filtersForWrite,
  scopeFor,
  type ScopeFor,
} from "../table-api/sql.js";
import {
  decideForPrincipal,
  patchKeepsScope,
  policiesDisabledFromEnv,
  stampInsertScope,
  type DecisionPrincipal,
  type PolicyDecision,
} from "./evaluate.js";
import { describePolicy, policyKind } from "./plain-language.js";

export const POLICY_EVAL_OPERATIONS = ["select", "insert", "update", "delete"] as const;
/** Count queries stop here; `rowsEvaluated === POLICY_EVAL_ROW_CAP` means capped. */
export const POLICY_EVAL_ROW_CAP = 10_000;
export const POLICY_EVAL_RATE_PER_MINUTE = 30;
export const POLICY_EVAL_MAX_BODY_BYTES = 64 * 1024;
const MAX_CLAIMS = 32;
/** Claims the server owns; never replayed in `hypothetical`. */
const RESERVED_CLAIMS = new Set<string>([
  ...RESERVED_JWT_CLAIMS,
  "sub",
  "role",
  "sid",
  "exp",
  "iat",
  "iss",
  "aud",
]);

export const HYPOTHETICAL_NOTE =
  "Advisory only: production verifies tokens and keeps only iss, aud, sub, email and sid, so no real request can carry these claims today. The headline result is what a real token for this principal gets.";

export type PolicyEvaluateReason =
  | "allowed_by_policy"
  | "policies_disabled"
  | "denied_by_policy"
  | "no_matching_policy_default_deny"
  | "rls_disabled_default_deny"
  | "row_outside_scope"
  | "patch_moves_row_out_of_scope"
  | "insert_outside_scope"
  | "user_disabled";

export type PolicyEvaluateMatchedPolicy = null | {
  id: string;
  name: string | null;
  effect: "allow" | "deny";
  kind: string;
  expression: string;
  plainLanguage: string;
};

export type PolicyEvaluateRowScope = null | {
  anyOf: Array<{ column: string; equals: string | null }>;
  /** True when a scope predicate ANDs several terms (not representable as a flat list). */
  lossy: boolean;
};

export type PolicyEvaluateHypothetical = {
  allowed: boolean;
  matchedPolicy: PolicyEvaluateMatchedPolicy;
  reason: PolicyEvaluateReason;
  rowAllowed: boolean | null;
  rowCount: number | null;
};

export type PolicyEvaluateUserStatus = {
  disabled: boolean;
  emailConfirmed: boolean;
  hasLiveSession: boolean;
};

export type PolicyEvaluateResult = {
  allowed: boolean;
  operation: JordPolicyOperation;
  table: string;
  schema: string;
  principal: {
    kind: "user" | "anon";
    uid: string | null;
    claims: Record<string, unknown>;
    userStatus: PolicyEvaluateUserStatus | null;
  };
  matchedPolicy: PolicyEvaluateMatchedPolicy;
  rowScope: PolicyEvaluateRowScope;
  rowsEvaluated: number;
  rowCount: number | null;
  rowAllowed: boolean | null;
  reason: PolicyEvaluateReason;
  /** Names (never values) of every key the caller sent in `claims`. */
  ignoredClaims: string[];
  hypothetical: PolicyEvaluateHypothetical | null;
  hypotheticalNote: string;
  /** True only when Postgres counts could not run under the simulated RLS session. */
  countsIgnoreNativeRls: boolean;
};

export class PolicyEvaluateError extends Error {
  constructor(
    readonly status: 400 | 404 | 503,
    readonly code:
      | "invalid_request"
      | "unknown_table"
      | "unknown_user"
      | "row_not_found"
      | "table_not_exposed"
      | "api_disabled",
    message: string,
  ) {
    super(message);
    this.name = "PolicyEvaluateError";
  }
}

const bad = (message: string) => new PolicyEvaluateError(400, "invalid_request", message);

function plainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function dialectOf(jord: JordDriverPort): "libsql" | "postgres" {
  return jord.dialect === "postgres" ? "postgres" : "libsql";
}

type SimPrincipal = DecisionPrincipal & { kind: "user" | "anon" };

/**
 * Run `work` with `jord.bindRlsSession` set to the simulated principal (the
 * same shape `rlsSessionFor` builds in app.ts), inside a fresh async scope so
 * the caller's (admin) session is restored when it returns.
 */
export function runUnderRlsSession<T>(
  jord: Pick<JordDriverPort, "bindRlsSession">,
  principal: SimPrincipal,
  work: () => Promise<T>,
): Promise<T> {
  if (!jord.bindRlsSession) return work();
  return new AsyncResource("jord.policy-evaluate").runInAsyncScope(() => {
    jord.bindRlsSession!({
      role: principal.kind,
      bucket: "",
      uid: principal.uid ?? "",
      claims: principal.claims,
    });
    return work();
  });
}

function selectOnly(info: JordTableInfo, filters: Filter[], limit: number): ParsedTableQuery {
  return {
    select: [info.columns[0]!.name],
    order: [],
    limit,
    offset: 0,
    filters,
    all: false,
    pk: [],
    count: "none",
    representation: false,
  };
}

/** `COUNT(*)` over at most `POLICY_EVAL_ROW_CAP` rows, with the GET scope SQL. */
async function cappedCount(
  jord: JordDriverPort,
  info: JordTableInfo,
  scope: ScopeFor | undefined,
): Promise<number> {
  const inner = compileSelect(info, selectOnly(info, [], POLICY_EVAL_ROW_CAP), dialectOf(jord), scope);
  const rows = await jord.query(`SELECT COUNT(*) AS n FROM (${inner.sql}) AS jord_policy_eval`, inner.args);
  return Number(rows[0]?.n ?? 0);
}

async function countWhere(
  jord: JordDriverPort,
  info: JordTableInfo,
  filters: Filter[],
  scope: ScopeFor | undefined,
): Promise<number> {
  const counted = compileCount(info, filters, dialectOf(jord), scope);
  const rows = await jord.query(counted.sql, counted.args);
  return Number(rows[0]?.n ?? 0);
}

function matchedPolicyOf(policy: JordPolicy | undefined): PolicyEvaluateMatchedPolicy {
  if (!policy) return null;
  return {
    id: policy.id,
    name: policy.name || null,
    effect: policy.effect === "deny" ? "deny" : "allow",
    kind: policyKind(policy),
    expression: policy.rules,
    plainLanguage: describePolicy(policy),
  };
}

/** Every scope term the table API would apply (union of the matching allows). */
function rowScopeOf(decision: PolicyDecision): PolicyEvaluateRowScope {
  if (!decision.allowed || !decision.scope) return null;
  const anyOf: Array<{ column: string; equals: string | null }> = [];
  let lossy = false;
  for (const predicate of decision.scope.anyOf) {
    if (predicate.length !== 1) lossy = true;
    for (const term of predicate) {
      anyOf.push({ column: term.column, equals: term.value === "" ? null : term.value });
    }
  }
  return { anyOf, lossy };
}

type ParsedPrincipal = {
  principal: SimPrincipal;
  ignoredClaims: string[];
  custom: Record<string, unknown>;
  userStatus: PolicyEvaluateUserStatus | null;
};

/**
 * The simulated principal exactly as `resolvePrincipalWithKeys` builds it from
 * a real token: a `user` from the `jord_users` row, or `anon`. Never
 * operator/service. Caller claims are collected but never applied here.
 */
async function simulatedPrincipal(
  jord: JordDriverPort,
  body: Record<string, unknown>,
  jwt: { iss: string; aud: string } | undefined,
): Promise<ParsedPrincipal> {
  const role = body.role ?? "user";
  if (role !== "user" && role !== "anon") throw bad("role must be 'user' or 'anon'");
  if (body.claims !== undefined && body.claims !== null && !plainObject(body.claims)) {
    throw bad("claims must be a JSON object");
  }
  const supplied = Object.entries((body.claims as Record<string, unknown> | null | undefined) ?? {});
  if (supplied.length > MAX_CLAIMS) throw bad(`claims accepts at most ${MAX_CLAIMS} keys`);
  const ignoredClaims = supplied.map(([key]) => key);
  const custom: Record<string, unknown> = {};
  for (const [key, value] of supplied) {
    if (RESERVED_CLAIMS.has(key) || value === undefined) continue;
    custom[key] = value;
  }
  const base = jwt ? { iss: jwt.iss, aud: jwt.aud } : {};
  if (role === "anon") {
    return { principal: { kind: "anon", role: "anon", claims: { ...base } }, ignoredClaims, custom, userStatus: null };
  }
  const id = typeof body.principalId === "string" ? body.principalId.trim() : "";
  if (!id) throw bad("principalId is required for role 'user'");
  const user = await getAdminUser(jord, id);
  if (!user) throw new PolicyEvaluateError(404, "unknown_user", "user not found");
  const live = await listSessions(jord, user.id);
  return {
    principal: {
      kind: "user",
      uid: user.id,
      role: "user",
      claims: { ...base, sub: user.id, ...(user.email ? { email: user.email } : {}) },
    },
    ignoredClaims,
    custom,
    userStatus: {
      disabled: user.disabledAt != null,
      emailConfirmed: user.emailConfirmed,
      hasLiveSession: live.length > 0,
    },
  };
}

/** PK `row` → the production PK filters (`filtersForWrite`, as `?pk=` on PATCH/DELETE). */
function pkFilters(info: JordTableInfo, row: unknown): Filter[] {
  if (!plainObject(row)) throw bad("row must be an object of primary key values");
  const keys = pkColumns(info).map((col) => col.name);
  if (keys.length === 0) throw bad("table has no primary key");
  const given = Object.keys(row);
  if (given.length !== keys.length || !keys.every((key) => given.includes(key))) {
    throw bad(`row keys must be exactly the primary key: ${keys.join(", ")}`);
  }
  const pk = keys.map((key) => {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") return value;
    throw bad(`row.${key} must be a string or number`);
  });
  return filtersForWrite(info, { ...selectOnly(info, [], 1), pk });
}

type Outcome = PolicyEvaluateHypothetical & { rowScope: PolicyEvaluateRowScope };

/** One evaluation for one principal; scoped SQL runs under that principal's RLS session. */
async function evaluateAs(input: {
  jord: JordDriverPort;
  info: JordTableInfo;
  table: string;
  schema: string;
  op: JordPolicyOperation;
  principal: SimPrincipal;
  rowFilters: Filter[] | null;
  values: Record<string, unknown> | undefined;
}): Promise<Outcome> {
  const { jord, info, table, schema, op, principal, rowFilters, values } = input;
  return runUnderRlsSession(jord, principal, async () => {
    // Same call and same env source (process.env) as the table API decide closure.
    const decide = (operation: JordPolicyOperation) =>
      decideForPrincipal({ jord, principal, tableName: table, schema, operation });
    const decision = await decide(op);
    const scope = decision.allowed ? scopeFor(info, decision.scope) : undefined;

    let rowAllowed: boolean | null = null;
    if (op === "insert") {
      if (values) rowAllowed = decision.allowed && stampInsertScope(scope?.scope, values) !== null;
    } else if (rowFilters) {
      rowAllowed = decision.allowed && (await countWhere(jord, info, rowFilters, scope)) > 0;
    }
    const patchOk = !(op === "update" && values && decision.allowed && !patchKeepsScope(scope?.scope, values));

    const selectDecision = op === "select" ? decision : await decide("select");
    const rowCount = selectDecision.allowed
      ? await cappedCount(jord, info, scopeFor(info, selectDecision.scope))
      : 0;

    const allowed = decision.allowed && rowAllowed !== false && patchOk;
    let reason: PolicyEvaluateReason;
    if (!decision.allowed) {
      if (decision.policy) {
        reason = "denied_by_policy";
      } else {
        const rls = await jord.getTableRls(table, schema);
        reason = rls == null || rls.rlsEnabled === false ? "rls_disabled_default_deny" : "no_matching_policy_default_deny";
      }
    } else if (!patchOk) {
      reason = "patch_moves_row_out_of_scope";
    } else if (rowAllowed === false) {
      reason = op === "insert" ? "insert_outside_scope" : "row_outside_scope";
    } else if (policiesDisabledFromEnv()) {
      reason = "policies_disabled";
    } else {
      reason = "allowed_by_policy";
    }
    return {
      allowed,
      matchedPolicy: matchedPolicyOf(decision.allowed ? decision.matched : decision.policy),
      reason,
      rowAllowed,
      rowCount,
      rowScope: rowScopeOf(decision),
    };
  });
}

const DISABLED_OUTCOME: Outcome = {
  allowed: false,
  matchedPolicy: null,
  reason: "user_disabled",
  rowAllowed: null,
  rowCount: null,
  rowScope: null,
};

/**
 * Evaluate one (principal, table, operation, row?) without side effects.
 * Throws `PolicyEvaluateError` for 400/404/503.
 */
export async function runPolicyEvaluation(
  deps: {
    jord: JordDriverPort;
    jwt?: { iss: string; aud: string };
    /** Same gate as the table API: `records` is 503 while the generated API is off. */
    generatedRecordsEnabled?: () => boolean;
  },
  body: unknown,
): Promise<PolicyEvaluateResult> {
  const { jord } = deps;
  if (!plainObject(body)) throw bad("JSON object body is required");
  const operation = body.operation;
  if (typeof operation !== "string" || !(POLICY_EVAL_OPERATIONS as readonly string[]).includes(operation)) {
    throw bad("operation must be select, insert, update or delete");
  }
  const op = operation as JordPolicyOperation;
  const table = body.table;
  if (typeof table !== "string" || table.length === 0) throw bad("table is required");
  if (RESERVED.test(table)) {
    throw new PolicyEvaluateError(404, "table_not_exposed", "table is not exposed to the table API");
  }
  if (table === "records" && deps.generatedRecordsEnabled && !deps.generatedRecordsEnabled()) {
    throw new PolicyEvaluateError(503, "api_disabled", "the generated records API is disabled");
  }
  if (!isValidSqlIdent(table)) throw bad("table is not a valid identifier");
  if (body.schema !== undefined && body.schema !== null && typeof body.schema !== "string") {
    throw bad("schema must be a string");
  }
  const resolved = await jord.resolveSchema(
    typeof body.schema === "string" && body.schema !== "" ? body.schema : undefined,
  );
  if (!resolved.ok) throw bad(resolved.message);
  const schema = resolved.schema;
  const info = await jord.describeTable(table, schema);
  if (!info || info.columns.length === 0) {
    throw new PolicyEvaluateError(404, "unknown_table", "table not found");
  }

  if (body.values !== undefined && !plainObject(body.values)) throw bad("values must be a JSON object");
  const values = body.values as Record<string, unknown> | undefined;
  if (values) {
    const columns = new Set(info.columns.map((col) => col.name));
    const unknown = Object.keys(values).filter((key) => !columns.has(key));
    if (unknown.length > 0) throw bad(`unknown column in values: ${unknown.join(", ")}`);
  }

  const parsed = await simulatedPrincipal(jord, body, deps.jwt);
  const { principal } = parsed;

  // `row` names an existing row for select/update/delete; inserts create a new one, so it is ignored.
  // Existence and `rowsEvaluated` are admin-side facts (unscoped).
  let rowFilters: Filter[] | null = null;
  if (body.row !== undefined && body.row !== null && op !== "insert") {
    try {
      rowFilters = pkFilters(info, body.row);
    } catch (err) {
      if (err instanceof TableApiError) throw bad(err.message);
      throw err;
    }
    if ((await countWhere(jord, info, rowFilters, undefined)) === 0) {
      throw new PolicyEvaluateError(404, "row_not_found", "no row with that primary key");
    }
  }
  const rowsEvaluated = await cappedCount(jord, info, undefined);

  const run = (who: SimPrincipal) =>
    evaluateAs({ jord, info, table, schema, op, principal: who, rowFilters, values });
  const disabled = parsed.userStatus?.disabled === true;
  // A disabled user's token is rejected (401) before any policy runs.
  const headline = disabled ? DISABLED_OUTCOME : await run(principal);

  let hypothetical: PolicyEvaluateHypothetical | null = null;
  if (Object.keys(parsed.custom).length > 0) {
    const what = disabled
      ? DISABLED_OUTCOME
      : await run({ ...principal, claims: { ...principal.claims, ...parsed.custom } });
    hypothetical = {
      allowed: what.allowed,
      matchedPolicy: what.matchedPolicy,
      reason: what.reason,
      rowAllowed: what.rowAllowed,
      rowCount: what.rowCount,
    };
  }

  return {
    allowed: headline.allowed,
    operation: op,
    table,
    schema,
    principal: {
      kind: principal.kind,
      uid: principal.uid ?? null,
      claims: principal.claims,
      userStatus: parsed.userStatus,
    },
    matchedPolicy: headline.matchedPolicy,
    rowScope: headline.rowScope,
    rowsEvaluated,
    rowCount: headline.rowCount,
    rowAllowed: headline.rowAllowed,
    reason: headline.reason,
    ignoredClaims: parsed.ignoredClaims,
    hypothetical,
    hypotheticalNote: HYPOTHETICAL_NOTE,
    // Postgres runs scoped SQL under the simulated RLS session; libSQL has no native RLS.
    countsIgnoreNativeRls: jord.dialect === "postgres" && !jord.bindRlsSession,
  };
}

function errorJson(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Limiter key: operator uid, else role + a hash of the bearer (never one shared key). */
export function policyEvaluateLimiterKey(
  principal: { uid?: string; role: string },
  authorization: string | undefined,
): string {
  if (principal.uid) return `admin:policy-evaluate:uid:${principal.uid}`;
  const bearer = (authorization ?? "").replace(/^Bearer\s+/i, "");
  const digest = createHash("sha256").update(bearer).digest("hex").slice(0, 32);
  return `admin:policy-evaluate:role:${principal.role}:${digest}`;
}

/** Mounted at `/admin`. Operator admin only; 30 evaluations per actor per minute. */
export function createPolicyEvaluateRoutes(deps: {
  jord: JordDriverPort;
  enqueueWrite?: <T>(work: () => Promise<T>) => Promise<T>;
  rateLimit?: RateLimitStore;
  jwt?: { iss: string; aud: string };
  generatedRecordsEnabled?: () => boolean;
}): Hono<{ Variables: JordAuthVariables }> {
  const routes = new Hono<{ Variables: JordAuthVariables }>();

  routes.post("/policies/evaluate", async (c) => {
    const actorPrincipal = c.get("principal");
    if (actorPrincipal.kind !== "operator" || actorPrincipal.role !== "admin") {
      return errorJson(403, "forbidden", "admin operator only");
    }
    const actor = actorPrincipal.uid ?? actorPrincipal.role;

    if (deps.rateLimit) {
      let hits: number;
      try {
        hits = await deps.rateLimit.hit(
          policyEvaluateLimiterKey(actorPrincipal, c.req.header("authorization")),
          60_000,
        );
      } catch (err) {
        // Fail closed: an unmetered tester is an enumeration oracle.
        console.error("[@altr/jord-server] policy evaluate limiter failed", err);
        return errorJson(503, "rate_limit_unavailable", "policy evaluation is temporarily unavailable");
      }
      if (hits > POLICY_EVAL_RATE_PER_MINUTE) {
        return errorJson(429, "rate_limited", "too many policy evaluations; try again in a minute");
      }
    }

    let body: unknown;
    try {
      // Byte-counted stream read: chunked bodies cannot exceed the cap.
      body = await readJsonCapped(c.req, POLICY_EVAL_MAX_BODY_BYTES);
    } catch (err) {
      if (err instanceof TableApiError && err.status === 413) {
        return errorJson(413, "payload_too_large", "body too large");
      }
      return errorJson(400, "invalid_request", "JSON object body is required");
    }

    let result: PolicyEvaluateResult;
    try {
      result = await runPolicyEvaluation(
        { jord: deps.jord, jwt: deps.jwt, generatedRecordsEnabled: deps.generatedRecordsEnabled },
        body,
      );
    } catch (err) {
      if (err instanceof PolicyEvaluateError) return errorJson(err.status, err.code, err.message);
      throw err;
    }

    // Audit who tested whom. No row values, no claim values.
    const audit = () =>
      auditKeyEvent(deps.jord, {
        source: "policies.evaluate",
        message: `policy evaluate ${result.operation} ${result.table}`,
        actor,
        action: "evaluate",
        detail: {
          principalKind: result.principal.kind,
          principalId: result.principal.uid,
          table: result.table,
          schema: result.schema,
          operation: result.operation,
          allowed: result.allowed,
          reason: result.reason,
          matchedPolicyId: result.matchedPolicy?.id ?? null,
          claimOverrides: result.ignoredClaims.length,
          hypothetical: result.hypothetical !== null,
          rowGiven: (body as Record<string, unknown>).row != null,
        },
      });
    await (deps.enqueueWrite ? deps.enqueueWrite(audit) : audit());

    return c.json(result);
  });

  return routes;
}
