/**
 * S0084 — app-facing realtime endpoint `/p/:project/realtime`.
 *
 * WebSocket (upgrade) with an SSE fallback on the same path. Reuses the
 * existing change feed: outbox seq + `listAfter` catch-up, the in-process
 * `RealtimeBus`, `liveDeliveryAllowed` (fail closed), per-row `select` policy
 * at delivery, `principalSessionLive` re-checks and `setDeadline` expiry.
 *
 * Credentials (browser-safe only):
 * - Project **publishable** key: `x-jord-key` or `apikey` header. `?apikey=`
 *   is accepted ONLY on the WebSocket upgrade (browsers cannot set headers
 *   there). Query strings can leak into proxy/access logs; Jord's own request
 *   log + OTel record `c.req.path` only, never the query.
 * - Optional `Authorization: Bearer <end-user JWT>` (user or anon). Without
 *   it the principal is `anon`.
 * - Any privileged credential (project secret / barrier key, the server token,
 *   an operator HMAC token, anything resolving to `service` / `operator`) is
 *   rejected with 401 `secret_key_not_allowed`, before any other check.
 *
 * Cursor too old → **409 `resync_required`** (the Studio feed uses 410 `gone`
 * for the same condition; 410 here is reserved for archived projects).
 *
 * Handshake order (no project-status oracle): privileged-credential refusal →
 * key lookup (hash + constant-time compare) → only then project match/status.
 * A bad key gets the same 401 `invalid_key` whether the slug exists, is
 * paused/archived or is unknown; 403 `wrong_project` / 410 need a VALID key.
 *
 * ===========================================================================
 * KNOWN LIMITATIONS (security review, documented decisions — not built here)
 * ===========================================================================
 * (a) CROSS-PROJECT DATA. Keys are bound to the `:project` slug, but tables,
 *     policies and the outbox all come from the single primary database
 *     (`deps.jord`). Every project's publishable key therefore reads the SAME
 *     tables today; the project binding only gates the handshake, revocation
 *     and archive. Do not market per-project isolation on this endpoint until
 *     data is routed per project. A `console.warn` fires once at registration
 *     when more than one active project exists.
 * (b) GLOBAL SEQ GAPS. `seq` / `cursor` are global outbox sequence numbers;
 *     gaps between consecutive deltas reveal that other (invisible) writes
 *     happened, and roughly how many. Accepted for Slice 0.
 * (c) X-FORWARDED-FOR is trusted for the per-IP caps and handshake rate limit
 *     (project-wide pattern). Deploy behind a proxy that overwrites it, or a
 *     client can spread itself across fake IPs.
 */

import { createHash, timingSafeEqual } from "node:crypto";

import type { createNodeWebSocket } from "@hono/node-ws";
import type { JordDriverPort, JordTableInfo } from "@altr/jord";
import type { Context, Hono } from "hono";
import { streamSSE } from "hono/streaming";

import type { JordAuthConfig } from "../auth/config.js";
import type { JwtKeyring } from "../auth/keyring.js";
import { verifyJwt, type JwtKey } from "../auth/jwt.js";
import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import {
  jwtEnvKeys,
  parseAuthorizationHeader,
  resolvePrincipalWithKeys,
  type ResolvedAccess,
} from "../auth/token.js";
import type { RateLimitStore } from "../http/rate-limit-store.js";
import type { PolicyDecision } from "../policies/evaluate.js";
import {
  findProjectKeyByHash,
  findProjectRef,
  type ProjectRef,
} from "../projects/key-lookup.js";
import { hashProjectKey } from "../projects/keys.js";
import {
  parseTableQuery,
  pkColumns,
  TableApiError,
  type Filter,
  type SqlValue,
} from "../table-api/query.js";
import { compileSelect, scopeFor } from "../table-api/sql.js";
import type { RealtimeBus } from "./bus.js";
import { channelPrincipalKey } from "./channel-auth.js";
import { setDeadline } from "./channel-socket.js";
import { liveDeliveryAllowed } from "./deliver.js";
import { principalSessionLive } from "./liveness.js";
import { sanitizeRowForOutbox, type Outbox, type OutboxRow } from "./outbox.js";
import {
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  REALTIME_V1_TABLE,
  type JordChangeEvent,
} from "./types.js";

type UpgradeWebSocket = ReturnType<typeof createNodeWebSocket>["upgradeWebSocket"];

export type AppRealtimeLimits = {
  /** Subscriptions per connection (documented: one table per connection). */
  maxSubscriptionsPerConnection: number;
  /** Filter predicates per subscription. */
  maxFilterPredicates: number;
  /** Values inside one `in.(...)` predicate. */
  maxInValues: number;
  snapshotDefaultRows: number;
  snapshotMaxRows: number;
  /** Concurrent connections per client IP. */
  maxPerIp: number;
  /** Concurrent connections per publishable key (i.e. per project). */
  maxPerKey: number;
  /** Concurrent connections per principal (uid, else kind+role@ip; S0083 rule). */
  maxPerPrincipal: number;
  /** Handshake attempts per IP per window (shared rate-limit store). */
  connectMaxHits: number;
  connectWindowMs: number;
  /** Client messages per WebSocket per window; excess closes 4429. */
  messageMaxHits: number;
  messageWindowMs: number;
  /** Catch-up batches (500 rows each) before demanding a resync. */
  maxCatchupBatches: number;
  /** Max bytes of one client message. */
  maxMessageBytes: number;
  /** Max serialized bytes of snapshot rows; beyond it rows stop (`truncated: true`). */
  maxSnapshotBytes: number;
  /** Outbound ws buffer above which the socket is closed 1013 (never queued). */
  maxBufferedBytes: number;
};

export const DEFAULT_APP_REALTIME_LIMITS: AppRealtimeLimits = {
  maxSubscriptionsPerConnection: 1,
  maxFilterPredicates: 4,
  maxInValues: 20,
  snapshotDefaultRows: 500,
  snapshotMaxRows: 1000,
  maxPerIp: 20,
  maxPerKey: 500,
  maxPerPrincipal: 8,
  connectMaxHits: 60,
  connectWindowMs: 60_000,
  messageMaxHits: 30,
  messageWindowMs: 10_000,
  maxCatchupBatches: 20,
  maxMessageBytes: 4096,
  maxSnapshotBytes: 2 * 1024 * 1024,
  maxBufferedBytes: 1024 * 1024,
};

const CATCHUP_BATCH = 500;
const PING_MS = 15_000;
const ALLOWED_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "in", "is"]);
const RESERVED_FILTER_KEYS = new Set([
  "select",
  "order",
  "limit",
  "offset",
  "all",
  "pk",
  "cursor",
  "schema",
]);

export const APP_REALTIME_CLOSE = {
  unauthorized: 4401,
  forbidden: 4403,
  projectGone: 4410,
  rateLimited: 4429,
  full: 1013,
  backpressure: 1013,
} as const;

/** Bytes queued on a Hono WSContext's underlying `ws` socket (0 when unknown). */
export function wsBufferedAmount(ws: { raw?: unknown }): number {
  try {
    const raw = ws.raw as { bufferedAmount?: unknown } | undefined;
    return typeof raw?.bufferedAmount === "number" ? raw.bufferedAmount : 0;
  } catch {
    return 0;
  }
}

/**
 * Send one frame unless the socket is congested (S0083 rule): over
 * `maxBufferedBytes` the socket is closed 1013 `backpressure` instead of
 * queueing. Returns false when the frame was not sent.
 */
export function sendWithBackpressure(
  ws: { raw?: unknown; send(data: string): void; close(code?: number, reason?: string): void },
  frame: unknown,
  maxBufferedBytes: number,
): boolean {
  if (wsBufferedAmount(ws) > maxBufferedBytes) {
    try {
      ws.close(APP_REALTIME_CLOSE.backpressure, "backpressure");
    } catch {
      /* already closed */
    }
    return false;
  }
  try {
    ws.send(JSON.stringify(frame));
    return true;
  } catch {
    return false;
  }
}

/**
 * Limitation (a) in the header: warn when several active projects share the
 * single primary database this endpoint reads. Never throws.
 */
export async function warnIfMultiProject(jord: JordDriverPort): Promise<boolean> {
  try {
    const rows = await jord.query(
      "SELECT COUNT(*) AS n FROM jord_projects WHERE status = 'active'",
    );
    const n = Number(rows[0]?.n ?? 0);
    if (n > 1) {
      console.warn(
        `[@altr/jord-server] app realtime: ${n} active projects share ONE database; every project's publishable key reads the same tables, policies and change feed (no per-project data isolation yet)`,
      );
      return true;
    }
  } catch {
    /* projects table not migrated yet */
  }
  return false;
}

function positiveInt(raw: string | undefined): number | null {
  const n = Number(raw?.trim());
  return raw?.trim() && Number.isInteger(n) && n > 0 ? n : null;
}

/** `JORD_REALTIME_APP_MAX_PER_{IP,KEY,PRINCIPAL}` / `_CONNECT_RATE` overrides. */
export function appRealtimeLimitsFromEnv(
  env: Record<string, string | undefined>,
): Partial<AppRealtimeLimits> {
  const out: Partial<AppRealtimeLimits> = {};
  const ip = positiveInt(env.JORD_REALTIME_APP_MAX_PER_IP);
  const key = positiveInt(env.JORD_REALTIME_APP_MAX_PER_KEY);
  const principal = positiveInt(env.JORD_REALTIME_APP_MAX_PER_PRINCIPAL);
  const rate = positiveInt(env.JORD_REALTIME_APP_CONNECT_RATE);
  const snapBytes = positiveInt(env.JORD_REALTIME_APP_MAX_SNAPSHOT_BYTES);
  const buffered = positiveInt(env.JORD_REALTIME_APP_MAX_BUFFERED_BYTES);
  if (snapBytes) out.maxSnapshotBytes = snapBytes;
  if (buffered) out.maxBufferedBytes = buffered;
  if (ip) out.maxPerIp = ip;
  if (key) out.maxPerKey = key;
  if (principal) out.maxPerPrincipal = principal;
  if (rate) out.connectMaxHits = rate;
  return out;
}

// ---------------------------------------------------------------------------
// Connection caps (same shape as the S0083 per-principal presence cap)
// ---------------------------------------------------------------------------

export type CapKeys = { ip: string; key: string; principal: string };
export type CapVerdict = "ip_full" | "key_full" | "principal_full" | null;

export class AppConnectionCaps {
  private readonly ip = new Map<string, number>();
  private readonly key = new Map<string, number>();
  private readonly principal = new Map<string, number>();

  constructor(private readonly limits: Pick<AppRealtimeLimits, "maxPerIp" | "maxPerKey" | "maxPerPrincipal">) {}

  check(keys: CapKeys): CapVerdict {
    if ((this.ip.get(keys.ip) ?? 0) >= this.limits.maxPerIp) return "ip_full";
    if ((this.key.get(keys.key) ?? 0) >= this.limits.maxPerKey) return "key_full";
    if ((this.principal.get(keys.principal) ?? 0) >= this.limits.maxPerPrincipal) {
      return "principal_full";
    }
    return null;
  }

  /** Re-checks (concurrent upgrades race the pre-upgrade check). */
  acquire(keys: CapKeys): (() => void) | null {
    if (this.check(keys)) return null;
    const bump = (map: Map<string, number>, k: string, d: number) => {
      const n = (map.get(k) ?? 0) + d;
      if (n <= 0) map.delete(k);
      else map.set(k, n);
    };
    bump(this.ip, keys.ip, 1);
    bump(this.key, keys.key, 1);
    bump(this.principal, keys.principal, 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      bump(this.ip, keys.ip, -1);
      bump(this.key, keys.key, -1);
      bump(this.principal, keys.principal, -1);
    };
  }

  get size(): number {
    let n = 0;
    for (const v of this.ip.values()) n += v;
    return n;
  }
}

// ---------------------------------------------------------------------------
// Handshake
// ---------------------------------------------------------------------------

export type HandshakeOk = {
  ok: true;
  principal: Principal;
  accessExp: number | null;
  project: ProjectRef;
  keyHash: string;
  caps: CapKeys;
};

export type HandshakeFail = {
  ok: false;
  status: 400 | 401 | 403 | 410 | 429 | 503;
  body: Record<string, unknown>;
};

const ANON: Principal = { kind: "anon", role: "anon", claims: {} };

function digestEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

function fail(
  status: HandshakeFail["status"],
  error: string,
  message: string,
  extra?: Record<string, unknown>,
): HandshakeFail {
  return { ok: false, status, body: { error, message, ...(extra ?? {}) } };
}

const SECRET_REJECT = () =>
  fail(
    401,
    "secret_key_not_allowed",
    "privileged credentials (secret key, server token, service or operator tokens) are not accepted here; use the project publishable key",
  );

function clientIp(c: Context): string {
  const incoming = (
    c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined
  )?.incoming;
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ||
    incoming?.socket?.remoteAddress?.slice(0, 64) ||
    "unknown"
  );
}

function projectGone(project: ProjectRef): HandshakeFail {
  return fail(410, "project_unavailable", "project is not active", {
    status: project.status,
    reason:
      project.status === "archived"
        ? "project is archived; keys are revoked"
        : `project is ${project.status}`,
  });
}

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

export type SubscribeRequest = {
  table: string;
  filter?: Record<string, string>;
  since?: number;
  limit?: number;
};

export type SubscribeFail = {
  ok: false;
  status: 400 | 403 | 409 | 429 | 500 | 503;
  body: Record<string, unknown>;
};

type SubscribePlan = {
  ok: true;
  table: string;
  info: JordTableInfo;
  filters: Filter[];
  decision: Extract<PolicyDecision, { allowed: true }>;
  since: number | null;
  limit: number;
};

function deniedTableBody(table: string) {
  // Same body whether the table is missing, reserved or denied by policy.
  return { error: "policy_denied", operation: "select", table };
}

/** Parse a raw subscribe payload (WS frame object or SSE query values). */
export function parseSubscribeRequest(
  raw: unknown,
): SubscribeRequest | { error: string; message: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "bad_subscribe", message: "subscribe must be an object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.table !== "string" || !o.table) {
    return { error: "bad_subscribe", message: "table is required" };
  }
  const out: SubscribeRequest = { table: o.table };
  if (o.filter != null) {
    if (typeof o.filter !== "object" || Array.isArray(o.filter)) {
      return {
        error: "bad_filter",
        message: 'filter must be an object of {"column": "op.value"}',
      };
    }
    const filter: Record<string, string> = {};
    for (const [k, v] of Object.entries(o.filter as Record<string, unknown>)) {
      if (typeof v !== "string") {
        return { error: "bad_filter", message: `filter.${k} must be "op.value"` };
      }
      filter[k] = v;
    }
    out.filter = filter;
  }
  if (o.since != null && o.since !== "") {
    const n = typeof o.since === "string" && /^\d+$/.test(o.since) ? Number(o.since) : o.since;
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
      return { error: "bad_since", message: "since must be a non-negative integer" };
    }
    out.since = n;
  }
  if (o.limit != null && o.limit !== "") {
    const n = typeof o.limit === "string" && /^\d+$/.test(o.limit) ? Number(o.limit) : o.limit;
    if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 1) {
      return { error: "bad_limit", message: "limit must be a positive integer" };
    }
    out.limit = n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Filter evaluation for deltas (mirror of the SQL the snapshot runs)
// ---------------------------------------------------------------------------

function compare(a: unknown, b: SqlValue): number | null {
  if (a == null || b == null) return null;
  if (typeof b === "number") {
    const n =
      typeof a === "number"
        ? a
        : typeof a === "string" && a.trim() !== ""
          ? Number(a)
          : typeof a === "boolean"
            ? Number(a)
            : Number.NaN;
    if (!Number.isFinite(n)) return null;
    return n < b ? -1 : n > b ? 1 : 0;
  }
  const s =
    typeof a === "string"
      ? a
      : typeof a === "number" || typeof a === "boolean"
        ? String(a)
        : null;
  if (s == null) return null;
  return s < b ? -1 : s > b ? 1 : 0;
}

/** SQL-like three-valued match collapsed to boolean (NULL never matches). */
export function rowMatchesFilters(row: Record<string, unknown>, filters: Filter[]): boolean {
  for (const f of filters) {
    const v = row[f.column];
    if (f.isNull) {
      if (v != null) return false;
      continue;
    }
    if (f.isNotNull) {
      if (v == null) return false;
      continue;
    }
    if (f.op === "in") {
      if (!f.values.some((value) => compare(v, value) === 0)) return false;
      continue;
    }
    const c = compare(v, f.values[0] ?? null);
    if (c == null) return false;
    const ok =
      f.op === "eq"
        ? c === 0
        : f.op === "neq"
          ? c !== 0
          : f.op === "gt"
            ? c > 0
            : f.op === "gte"
              ? c >= 0
              : f.op === "lt"
                ? c < 0
                : f.op === "lte"
                  ? c <= 0
                  : false;
    if (!ok) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

export type AppRealtimeFrame =
  | {
      type: "snapshot";
      table: string;
      pk: string[];
      rows: Array<Record<string, unknown>>;
      cursor: number;
      truncated: boolean;
    }
  | { type: "subscribed"; table: string; cursor: number }
  | (JordChangeEvent & { row?: Record<string, unknown> | null })
  | { type: "resync"; table: string; seq: number | null; error: "resync_required" }
  | { type: "error"; status: number; error: string; [k: string]: unknown };

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export type AppRealtimeDeps = {
  jord: JordDriverPort;
  auth: JordAuthConfig;
  keyring?: JwtKeyring;
  outbox: Outbox;
  bus: RealtimeBus;
  decide: (
    principal: Principal,
    table: string,
    operation: "select",
    extra?: { row?: Record<string, unknown> | null },
  ) => Promise<PolicyDecision>;
  /** Bind the Postgres RLS session for the snapshot read. */
  bindRls?: (principal: Principal) => void;
  upgradeWebSocket: UpgradeWebSocket;
  rateLimit: RateLimitStore;
  recheckMs: number;
  limits?: Partial<AppRealtimeLimits>;
};

export function createAppRealtime(deps: AppRealtimeDeps) {
  const limits: AppRealtimeLimits = { ...DEFAULT_APP_REALTIME_LIMITS, ...(deps.limits ?? {}) };
  const caps = new AppConnectionCaps(limits);
  const dialect: "libsql" | "postgres" = deps.jord.dialect === "postgres" ? "postgres" : "libsql";

  async function jwtKeys(): Promise<JwtKey[]> {
    let keys = jwtEnvKeys(deps.auth);
    if (deps.keyring) {
      try {
        keys = await deps.keyring.keys();
      } catch (err) {
        console.error("[@altr/jord-server] JWT keyring unavailable; using env keys", err);
      }
    }
    return keys;
  }

  async function resolveBearer(bearer: string): Promise<ResolvedAccess | null> {
    return resolvePrincipalWithKeys(bearer, deps.auth, await jwtKeys());
  }

  /** True when `value` is any privileged credential. Never logs the value. */
  async function isPrivileged(value: string): Promise<boolean> {
    if (/^jord_(sec|bar)_/.test(value)) return true;
    if (digestEqual(value, deps.auth.secret)) return true;
    if (value.startsWith("jord_pub_")) return false;
    // A validly signed JWT whose role is not an end-user role (service_role,
    // admin, …) is a privileged credential, not an "invalid token".
    if (value.split(".").length === 3) {
      const keys = await jwtKeys();
      if (keys.length > 0) {
        const claims = verifyJwt(value, { keys, iss: deps.auth.jwtIss, aud: deps.auth.jwtAud });
        if (claims && claims.role !== "user" && claims.role !== "anon") return true;
      }
    }
    const resolved = await resolveBearer(value);
    return resolved != null && resolved.principal.kind !== "user" && resolved.principal.kind !== "anon";
  }

  async function handshake(c: Context): Promise<HandshakeOk | HandshakeFail> {
    const ip = clientIp(c);
    try {
      const hits = await deps.rateLimit.hit(`rt-app:${ip}`, limits.connectWindowMs);
      if (hits > limits.connectMaxHits) {
        return fail(429, "too_many_requests", "too many realtime connection attempts");
      }
    } catch (err) {
      console.error("[@altr/jord-server] realtime rate-limit store failed, allowing", err);
    }

    const headerKey = (c.req.header("x-jord-key") ?? c.req.header("apikey"))?.trim() || null;
    const queryKey = c.req.query("apikey")?.trim() || null;
    const authHeader = c.req.header("authorization");
    const bearer = parseAuthorizationHeader(authHeader);
    const isUpgrade = c.req.header("upgrade")?.toLowerCase() === "websocket";

    // 1. Privileged credentials are refused before anything else.
    for (const value of [headerKey, queryKey, bearer]) {
      if (value && (await isPrivileged(value))) return SECRET_REJECT();
    }
    if (queryKey && !isUpgrade) {
      return fail(400, "apikey_query_ws_only", "?apikey= is only accepted on the WebSocket upgrade; send the x-jord-key header");
    }
    if (headerKey && queryKey && !digestEqual(headerKey, queryKey)) {
      return fail(401, "invalid_key", "conflicting project keys");
    }
    const key = headerKey ?? queryKey;
    if (!key) {
      return fail(401, "missing_key", "project publishable key required (x-jord-key or apikey header)");
    }
    if (authHeader && !bearer) {
      return fail(401, "invalid_token", "Authorization must be Bearer <end-user JWT>");
    }

    // 2. Key FIRST (hash lookup + constant-time compare), then the project.
    // An invalid key never learns whether the slug exists or its status:
    // unknown / paused / archived projects all answer the same 401.
    const keyHash = hashProjectKey(key);
    const match = key.startsWith("jord_pub_")
      ? await findProjectKeyByHash(deps.jord, keyHash)
      : null;
    if (!match) return fail(401, "invalid_key", "invalid project key");
    if (match.kind !== "publishable") return SECRET_REJECT();
    const project = await findProjectRef(deps.jord, c.req.param("project") ?? "");
    if (!project || match.projectId !== project.id) {
      return fail(403, "wrong_project", "key does not belong to this project");
    }
    if (project.status !== "active") return projectGone(project);

    // 3. Optional end-user JWT (normal path incl. session check).
    let principal: Principal = ANON;
    let accessExp: number | null = null;
    if (bearer) {
      const resolved = await resolveBearer(bearer);
      if (!resolved) return fail(401, "invalid_token", "invalid or expired token");
      if (resolved.principal.kind !== "user" && resolved.principal.kind !== "anon") {
        return SECRET_REJECT();
      }
      if (!(await principalSessionLive(deps.jord, resolved.principal))) {
        return fail(401, "session_revoked", "session revoked or expired");
      }
      principal = resolved.principal;
      accessExp = resolved.accessExp;
    }

    // 4. Caps.
    const capKeys: CapKeys = {
      ip,
      key: `${project.id}:${keyHash.slice(0, 16)}`,
      principal: `${project.id}|${channelPrincipalKey(principal, c.req.header("x-forwarded-for"), ip)}`,
    };
    const full = caps.check(capKeys);
    if (full) {
      return fail(429, "too_many_connections", `realtime connection cap reached (${full})`, { cap: full });
    }
    if (deps.bus.size >= MAX_REALTIME_SUBSCRIBERS) {
      return fail(503, "realtime_full", "too many realtime subscribers");
    }
    return { ok: true, principal, accessExp, project, keyHash, caps: capKeys };
  }

  /** Validate a subscription before any frame / stream byte is sent. */
  async function plan(
    principal: Principal,
    req: SubscribeRequest,
  ): Promise<SubscribePlan | SubscribeFail> {
    const { table } = req;
    if (table === REALTIME_V1_TABLE) {
      return {
        ok: false,
        status: 400,
        body: { error: "unsupported_table", message: "records is not available on the app endpoint" },
      };
    }
    if (!isRealtimeSubscribeTable(table)) {
      return { ok: false, status: 403, body: deniedTableBody(table) };
    }
    let decision: PolicyDecision;
    try {
      decision = await deps.decide(principal, table, "select");
    } catch (err) {
      console.error("[@altr/jord-server] realtime subscribe policy check failed", err);
      return { ok: false, status: 403, body: deniedTableBody(table) };
    }
    if (!decision.allowed) return { ok: false, status: 403, body: deniedTableBody(table) };
    const info = await deps.jord.describeTable(table);
    if (!info) return { ok: false, status: 403, body: deniedTableBody(table) };

    const entries = Object.entries(req.filter ?? {});
    if (entries.length > limits.maxFilterPredicates) {
      return {
        ok: false,
        status: 400,
        body: { error: "cap_exceeded", message: `filter allows at most ${limits.maxFilterPredicates} predicates` },
      };
    }
    const params = new URLSearchParams();
    for (const [column, value] of entries) {
      if (RESERVED_FILTER_KEYS.has(column)) {
        return { ok: false, status: 400, body: { error: "bad_filter", message: `${column} cannot be filtered` } };
      }
      const op = value.slice(0, Math.max(0, value.indexOf(".")));
      if (!ALLOWED_OPS.has(op)) {
        return {
          ok: false,
          status: 400,
          body: { error: "bad_filter", message: `operator must be one of ${[...ALLOWED_OPS].join(", ")}` },
        };
      }
      params.append(column, value);
    }
    let filters: Filter[];
    try {
      filters = parseTableQuery(info, params, undefined).filters;
    } catch (err) {
      if (err instanceof TableApiError) {
        return { ok: false, status: 400, body: { error: err.code, message: err.message } };
      }
      throw err;
    }
    if (filters.some((f) => f.op === "in" && f.values.length > limits.maxInValues)) {
      return {
        ok: false,
        status: 400,
        body: { error: "cap_exceeded", message: `in() allows at most ${limits.maxInValues} values` },
      };
    }

    let since: number | null = null;
    if (req.since != null) {
      since = req.since;
      const floor = await deps.outbox.minSeq();
      // Same expiry predicate as the Studio feed (`/realtime?since=`).
      const expired = floor == null ? since > 0 : since < floor - 1;
      if (expired) {
        return {
          ok: false,
          status: 409,
          body: {
            error: "resync_required",
            message: "since is older than the retained change log; subscribe again without since",
            floor,
          },
        };
      }
    }
    const limit = Math.min(req.limit ?? limits.snapshotDefaultRows, limits.snapshotMaxRows);
    return { ok: true, table, info, filters, decision, since, limit };
  }

  async function rowVisible(
    principal: Principal,
    p: SubscribePlan,
    row: Record<string, unknown> | null,
  ): Promise<boolean> {
    if (!row) return false;
    if (!rowMatchesFilters(row, p.filters)) return false;
    const decision = await deps.decide(principal, p.table, "select", { row });
    return decision.allowed;
  }

  /** Delta frame for one outbox row, or null when nothing may be sent. */
  async function deltaFor(
    principal: Principal,
    p: SubscribePlan,
    event: JordChangeEvent,
    row: { oldJson: string | null; newJson: string | null; op: string },
  ): Promise<AppRealtimeFrame | null> {
    if (event.op === "resync") {
      const d = await deps.decide(principal, p.table, "select");
      return d.allowed ? { type: "resync", table: p.table, seq: event.seq ?? null, error: "resync_required" } : null;
    }
    const parse = (raw: string | null) => {
      if (!raw) return null;
      const v = JSON.parse(raw) as unknown;
      return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
    };
    const next = parse(row.newJson);
    const prev = parse(row.oldJson);
    if (event.op !== "delete" && (await rowVisible(principal, p, next))) {
      return { ...event, row: next };
    }
    // Row left the visible set (deleted, filtered out or no longer readable).
    if (event.op !== "insert" && (await rowVisible(principal, p, prev))) {
      return { ...event, op: "delete", row: null };
    }
    return null;
  }

  async function snapshot(principal: Principal, p: SubscribePlan) {
    const parsed = parseTableQuery(p.info, new URLSearchParams(), undefined);
    parsed.filters = p.filters;
    parsed.limit = p.limit + 1;
    parsed.offset = 0;
    parsed.order = pkColumns(p.info).map((col) => ({ column: col.name, dir: "asc" as const }));
    const compiled = compileSelect(p.info, parsed, dialect, scopeFor(p.info, p.decision.scope));
    deps.bindRls?.(principal);
    const raw = await deps.jord.query(compiled.sql, compiled.args as Array<string | number | null>);
    let truncated = raw.length > p.limit;
    const rows: Array<Record<string, unknown>> = [];
    // Serialized-size cap: one snapshot frame never exceeds maxSnapshotBytes
    // of row payload; the rest is dropped and the client sees truncated:true.
    let bytes = 0;
    for (const r of raw.slice(0, p.limit)) {
      const clean = sanitizeRowForOutbox(r, new Set()) ?? {};
      // Policy per row (fail closed), same rule as delivery.
      let allowed = false;
      try {
        allowed = (await deps.decide(principal, p.table, "select", { row: clean })).allowed;
      } catch {
        /* skipped */
      }
      if (!allowed) continue;
      const size = Buffer.byteLength(JSON.stringify(clean), "utf8") + 1;
      if (bytes + size > limits.maxSnapshotBytes) {
        truncated = true;
        break;
      }
      bytes += size;
      rows.push(clean);
    }
    return { rows, truncated };
  }

  /**
   * Run one subscription: snapshot (or resume) → catch-up from the cursor →
   * live deltas from the bus. All work is serialized on one chain; events at
   * or below the last sent seq are dropped (no duplicates across the
   * catch-up / live boundary).
   */
  function run(
    principal: Principal,
    p: SubscribePlan,
    send: (frame: AppRealtimeFrame) => Promise<void> | void,
    onEnd: (reason: "resync" | "error") => void,
  ): (() => void) | null {
    let lastSeq = -1;
    let stopped = false;
    let chain: Promise<void> = Promise.resolve();
    const enqueue = (work: () => Promise<void>) => {
      chain = chain.then(async () => {
        if (stopped) return;
        try {
          await work();
        } catch (err) {
          console.error("[@altr/jord-server] app realtime send failed", err);
        }
      });
    };
    const deliver = async (event: JordChangeEvent, known?: OutboxRow) => {
      if (event.seq == null || event.seq <= lastSeq) return;
      lastSeq = event.seq;
      const out: { frame: AppRealtimeFrame | null } = { frame: null };
      const ok = await liveDeliveryAllowed({
        event,
        getBySeq: async (seq) => (known && known.seq === seq ? known : deps.outbox.getBySeq(seq)),
        allowed: async (ev, row) => {
          out.frame = await deltaFor(principal, p, ev, row);
          return out.frame != null;
        },
      });
      const frame = out.frame;
      if (!ok || !frame) return;
      await send(frame);
      if (frame.type === "resync") {
        stopped = true;
        onEnd("resync");
      }
    };

    const unsubscribe = deps.bus.trySubscribeFiltered({ table: p.table }, (event) => {
      enqueue(() => deliver(event));
    });
    if (!unsubscribe) return null;

    enqueue(async () => {
      try {
        let cursor: number;
        if (p.since == null) {
          cursor = await deps.outbox.readableWatermark();
          const snap = await snapshot(principal, p);
          await send({
            type: "snapshot",
            table: p.table,
            pk: pkColumns(p.info).map((col) => col.name),
            rows: snap.rows,
            cursor,
            truncated: snap.truncated,
          });
        } else {
          cursor = p.since;
          await send({ type: "subscribed", table: p.table, cursor });
        }
        lastSeq = cursor;
        for (let batch = 0; ; batch += 1) {
          if (batch >= limits.maxCatchupBatches) {
            await send({ type: "resync", table: p.table, seq: lastSeq, error: "resync_required" });
            stopped = true;
            onEnd("resync");
            return;
          }
          const rows = await deps.outbox.listAfter(lastSeq, { table: p.table, limit: CATCHUP_BATCH });
          for (const row of rows) {
            if (stopped) return;
            await deliver(deps.outbox.toEvent(row), row);
          }
          if (rows.length < CATCHUP_BATCH) break;
        }
      } catch (err) {
        console.error("[@altr/jord-server] app realtime snapshot failed", err);
        await send({ type: "error", status: 500, error: "snapshot_failed" });
        stopped = true;
        onEnd("error");
      }
    });

    return () => {
      stopped = true;
      unsubscribe();
    };
  }

  /** Periodic re-check: session, key still valid, project still active. */
  async function recheck(
    hs: HandshakeOk,
  ): Promise<{ ok: true } | { ok: false; code: number; reason: string }> {
    if (!(await principalSessionLive(deps.jord, hs.principal))) {
      return { ok: false, code: APP_REALTIME_CLOSE.unauthorized, reason: "session_revoked" };
    }
    try {
      const project = await findProjectRef(deps.jord, hs.project.id);
      if (!project || project.status !== "active") {
        return { ok: false, code: APP_REALTIME_CLOSE.projectGone, reason: "project_unavailable" };
      }
      const match = await findProjectKeyByHash(deps.jord, hs.keyHash);
      if (!match || match.kind !== "publishable" || match.projectId !== hs.project.id) {
        return { ok: false, code: APP_REALTIME_CLOSE.unauthorized, reason: "key_revoked" };
      }
    } catch (err) {
      console.error("[@altr/jord-server] app realtime re-check failed", err);
      return { ok: false, code: APP_REALTIME_CLOSE.unauthorized, reason: "recheck_failed" };
    }
    return { ok: true };
  }

  const handshakes = new WeakMap<Request, HandshakeOk>();

  function register(app: Hono<{ Variables: JordAuthVariables }>): void {
    // Limitation (a): warn once if several active projects share this DB.
    void warnIfMultiProject(deps.jord);
    app.get(
      "/p/:project/realtime",
      async (c, next) => {
        const hs = await handshake(c);
        if (!hs.ok) return c.json(hs.body, hs.status);
        handshakes.set(c.req.raw, hs);
        c.set("principal", hs.principal);
        c.set("accessExp", hs.accessExp);
        await next();
      },
      deps.upgradeWebSocket((c) => {
        const hs = handshakes.get(c.req.raw);
        let release: (() => void) | null = null;
        // Subscription slot. `pending` counts toward the per-connection cap
        // exactly like `active`; `gen` invalidates any plan still in flight
        // when the slot is ended (unsubscribe, resync, error, socket close).
        let slot: "idle" | "pending" | "active" = "idle";
        let gen = 0;
        let closed = false;
        let stop: (() => void) | null = null;
        let socket: Parameters<typeof sendWithBackpressure>[0] | null = null;
        let ping: ReturnType<typeof setInterval> | null = null;
        let checker: ReturnType<typeof setInterval> | null = null;
        let exp: { clear(): void } | null = null;
        let windowStart = Date.now();
        let windowHits = 0;
        const endSlot = () => {
          gen += 1;
          const s = stop;
          stop = null;
          slot = "idle";
          s?.();
        };
        const cleanup = () => {
          closed = true;
          if (ping) clearInterval(ping);
          if (checker) clearInterval(checker);
          exp?.clear();
          endSlot();
          release?.();
          release = null;
        };
        /** Every outbound frame goes through the backpressure check. */
        const sendFrame = (frame: unknown) => {
          if (closed || !socket) return;
          sendWithBackpressure(socket, frame, limits.maxBufferedBytes);
        };
        return {
          onOpen(_evt, ws) {
            socket = ws;
            const close = (code: number, reason: string) => {
              try {
                ws.close(code, reason);
              } catch {
                /* already closed */
              }
            };
            if (!hs) return close(APP_REALTIME_CLOSE.unauthorized, "unauthorized");
            release = caps.acquire(hs.caps);
            if (!release) return close(APP_REALTIME_CLOSE.rateLimited, "too_many_connections");
            if (hs.accessExp != null) {
              exp = setDeadline(hs.accessExp, () => close(APP_REALTIME_CLOSE.unauthorized, "token_expired"));
            }
            ping = setInterval(() => sendFrame({ type: "ping" }), PING_MS);
            checker = setInterval(() => {
              void recheck(hs).then((r) => {
                if (!r.ok) close(r.code, r.reason);
              });
            }, deps.recheckMs);
            sendFrame({
              type: "ready",
              project: hs.project.slug,
              principal: hs.principal.kind,
              limits: {
                subscriptions: limits.maxSubscriptionsPerConnection,
                filter_predicates: limits.maxFilterPredicates,
                snapshot_rows: limits.snapshotMaxRows,
              },
            });
          },
          onMessage(evt, ws) {
            if (!hs || closed) return;
            socket = ws;
            const now = Date.now();
            if (now - windowStart > limits.messageWindowMs) {
              windowStart = now;
              windowHits = 0;
            }
            windowHits += 1;
            if (windowHits > limits.messageMaxHits) {
              try {
                ws.close(APP_REALTIME_CLOSE.rateLimited, "rate_limited");
              } catch {
                /* closed */
              }
              return;
            }
            const raw = typeof evt.data === "string" ? evt.data : "";
            if (raw.length > limits.maxMessageBytes) {
              return sendFrame({ type: "error", status: 400, error: "message_too_large" });
            }
            let msg: Record<string, unknown>;
            try {
              const parsed = JSON.parse(raw) as unknown;
              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("shape");
              msg = parsed as Record<string, unknown>;
            } catch {
              if (raw.includes("pong")) return;
              return sendFrame({ type: "error", status: 400, error: "bad_message" });
            }
            if (msg.type === "pong" || msg.type === "ping") return;
            if (msg.type === "unsubscribe") {
              // Cancels a pending plan too (its generation goes stale).
              endSlot();
              return sendFrame({ type: "unsubscribed" });
            }
            if (msg.type !== "subscribe") {
              return sendFrame({ type: "error", status: 400, error: "bad_message" });
            }
            // One slot per connection: pending plans count, not only started ones.
            if (slot !== "idle") {
              return sendFrame({
                type: "error",
                status: 409,
                error: "already_subscribed",
                message: `at most ${limits.maxSubscriptionsPerConnection} subscription per connection; unsubscribe first`,
              });
            }
            const req = parseSubscribeRequest(msg);
            if ("error" in req) return sendFrame({ type: "error", status: 400, ...req });
            gen += 1;
            const my = gen;
            slot = "pending";
            const current = () => !closed && my === gen;
            void plan(hs.principal, req)
              .then((p) => {
                // Stale (unsubscribed / re-subscribed / socket closed): nothing
                // was acquired yet, so there is nothing to release.
                if (!current()) return;
                if (!p.ok) {
                  slot = "idle";
                  return sendFrame({ type: "error", status: p.status, ...p.body });
                }
                const s = run(
                  hs.principal,
                  p,
                  (frame) => {
                    if (current()) sendFrame(frame);
                  },
                  () => {
                    if (current()) endSlot();
                  },
                );
                if (!s) {
                  slot = "idle";
                  return sendFrame({ type: "error", status: 503, error: "realtime_full" });
                }
                if (!current()) {
                  s();
                  return;
                }
                stop = s;
                slot = "active";
              })
              .catch((err) => {
                if (!current()) return;
                slot = "idle";
                console.error("[@altr/jord-server] app realtime subscribe failed", err);
                sendFrame({ type: "error", status: 500, error: "subscribe_failed" });
              });
          },
          onClose: cleanup,
          onError: cleanup,
        };
      }),
      // SSE fallback: subscription in the query (`table`, `filter` JSON, `since`, `limit`).
      async (c) => {
        const hs = handshakes.get(c.req.raw);
        if (!hs) return c.json({ error: "unauthorized" }, 401);
        let filter: unknown;
        const filterRaw = c.req.query("filter");
        if (filterRaw) {
          if (filterRaw.length > limits.maxMessageBytes) {
            return c.json({ error: "bad_filter", message: "filter too large" }, 400);
          }
          try {
            filter = JSON.parse(filterRaw);
          } catch {
            return c.json({ error: "bad_filter", message: "filter must be JSON" }, 400);
          }
        }
        const req = parseSubscribeRequest({
          table: c.req.query("table"),
          filter,
          since: c.req.query("since"),
          limit: c.req.query("limit"),
        });
        if ("error" in req) return c.json(req, 400);
        const p = await plan(hs.principal, req);
        if (!p.ok) return c.json(p.body, p.status);
        const release = caps.acquire(hs.caps);
        if (!release) {
          return c.json({ error: "too_many_connections", message: "realtime connection cap reached" }, 429);
        }
        return streamSSE(c, async (stream) => {
          let ended: string | null = null;
          const stop = run(
            hs.principal,
            p,
            async (frame) => {
              const type = (frame as { type: string }).type;
              await stream.writeSSE({ event: type, data: JSON.stringify(frame) });
            },
            (reason) => {
              ended = reason;
            },
          );
          if (!stop) {
            release();
            await stream.writeSSE({ event: "error", data: JSON.stringify({ status: 503, error: "realtime_full" }) });
            return;
          }
          const ping = setInterval(() => {
            void stream.writeSSE({ event: "ping", data: "ping" });
          }, PING_MS);
          let nextCheck = Date.now() + deps.recheckMs;
          try {
            while (!stream.aborted && !ended) {
              if (hs.accessExp != null && Date.now() >= hs.accessExp) {
                await stream.writeSSE({ event: "expired", data: "token_expired" });
                break;
              }
              if (Date.now() >= nextCheck) {
                nextCheck = Date.now() + deps.recheckMs;
                const r = await recheck(hs);
                if (!r.ok) {
                  await stream.writeSSE({ event: "expired", data: r.reason });
                  break;
                }
              }
              await stream.sleep(Math.min(250, deps.recheckMs));
            }
          } finally {
            clearInterval(ping);
            stop();
            release();
          }
        });
      },
    );
  }

  return { register, caps, handshake, plan, limits };
}
