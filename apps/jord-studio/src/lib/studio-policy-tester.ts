/** Policy tester helpers (S0077) — request building, validation, result text. */

export const TESTER_OPERATIONS = ["select", "insert", "update", "delete"] as const;
export type TesterOperation = (typeof TESTER_OPERATIONS)[number];

export type TesterRole = "user" | "anon";

/** Claims the server always derives itself; overrides for these are ignored. */
export const RESERVED_CLAIMS = [
  "sub",
  "role",
  "sid",
  "exp",
  "iat",
  "iss",
  "aud",
] as const;

export const CLAIMS_MAX_BYTES = 4096;
export const TESTER_HISTORY_CAP = 10;

export type EvaluateRequest = {
  principalId?: string;
  claims?: Record<string, unknown>;
  role?: TesterRole;
  operation: TesterOperation;
  table: string;
  schema?: string;
  row?: Record<string, string | number>;
  values?: Record<string, unknown>;
};

export type MatchedPolicy = {
  id: string;
  name: string | null;
  effect: "allow" | "deny";
  kind: string;
  expression: string;
  plainLanguage: string;
};

export type RowScopeTerm = { column: string; equals: string | null };

export type RowScope = { anyOf: RowScopeTerm[]; lossy: boolean };

export type UserStatus = {
  disabled: boolean;
  emailConfirmed: boolean;
  hasLiveSession: boolean;
};

/** What would happen if a token carried the typed claims (advisory). */
export type HypotheticalResult = {
  allowed: boolean;
  matchedPolicy: MatchedPolicy | null;
  reason: string;
  rowAllowed: boolean | null;
  rowCount: number | null;
};

/**
 * Headline fields describe the REAL-token principal. Every field added after
 * the first server version is optional so older servers still render.
 */
export type EvaluateResult = {
  allowed: boolean;
  operation: TesterOperation;
  table: string;
  schema: string;
  principal: {
    kind: "user" | "anon";
    uid: string | null;
    claims: Record<string, unknown>;
    userStatus?: UserStatus | null;
  };
  matchedPolicy: MatchedPolicy | null;
  rowScope?: RowScope | null;
  rowsEvaluated: number;
  rowCount: number | null;
  rowAllowed: boolean | null;
  reason: string;
  ignoredClaims?: string[];
  hypothetical?: HypotheticalResult | null;
  hypotheticalNote?: string;
  countsIgnoreNativeRls?: boolean;
};

/** Accepts the legacy `{ column, equals }` scope as well as `{ anyOf, lossy }`. */
export function normalizeRowScope(raw: unknown): RowScope | null {
  if (!isPlainObject(raw)) return null;
  if (Array.isArray(raw.anyOf)) {
    const anyOf: RowScopeTerm[] = [];
    for (const t of raw.anyOf) {
      if (isPlainObject(t) && typeof t.column === "string") {
        anyOf.push({ column: t.column, equals: typeof t.equals === "string" ? t.equals : null });
      }
    }
    return { anyOf, lossy: raw.lossy === true };
  }
  if (typeof raw.column === "string") {
    return {
      anyOf: [{ column: raw.column, equals: typeof raw.equals === "string" ? raw.equals : null }],
      lossy: false,
    };
  }
  return null;
}

export function normalizeUserStatus(raw: unknown): UserStatus | null {
  if (!isPlainObject(raw)) return null;
  return {
    disabled: raw.disabled === true,
    emailConfirmed: raw.emailConfirmed !== false,
    hasLiveSession: raw.hasLiveSession !== false,
  };
}

/** Tolerant normaliser for the server response (older servers lack new fields). */
export function normalizeEvaluateResult(raw: EvaluateResult): EvaluateResult {
  const r = raw as EvaluateResult;
  const hyp = isPlainObject(r.hypothetical) ? r.hypothetical : null;
  return {
    ...r,
    principal: {
      ...r.principal,
      claims: isPlainObject(r.principal?.claims) ? r.principal.claims : {},
      userStatus: normalizeUserStatus(r.principal?.userStatus),
    },
    rowScope: normalizeRowScope(r.rowScope),
    ignoredClaims: Array.isArray(r.ignoredClaims)
      ? r.ignoredClaims.filter((k): k is string => typeof k === "string")
      : [],
    hypothetical: hyp
      ? {
          allowed: hyp.allowed === true,
          matchedPolicy: hyp.matchedPolicy ?? null,
          reason: typeof hyp.reason === "string" ? hyp.reason : "",
          rowAllowed: typeof hyp.rowAllowed === "boolean" ? hyp.rowAllowed : null,
          rowCount: typeof hyp.rowCount === "number" ? hyp.rowCount : null,
        }
      : null,
    hypotheticalNote: typeof r.hypotheticalNote === "string" ? r.hypotheticalNote : undefined,
    countsIgnoreNativeRls: r.countsIgnoreNativeRls === true,
  };
}

/** Human text for one row-scope term. */
export function rowScopeTermText(t: RowScopeTerm): string {
  return `${t.column} = ${t.equals ?? "caller id"}`;
}

export type UserStatusNotice = {
  level: "error" | "warning" | "info";
  text: string;
};

/** Alerts derived from the user's real account state. */
export function userStatusNotices(status: UserStatus | null | undefined): UserStatusNotice[] {
  if (!status) return [];
  const out: UserStatusNotice[] = [];
  if (status.disabled) {
    out.push({
      level: "error",
      text: "This user is disabled: real requests with their token are rejected (401).",
    });
  }
  if (!status.hasLiveSession) {
    out.push({
      level: "warning",
      text: "No active session: a real token would be rejected.",
    });
  }
  if (!status.emailConfirmed) {
    out.push({ level: "info", text: "This user has not confirmed their email." });
  }
  return out;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function isReservedClaim(key: string): boolean {
  return (RESERVED_CLAIMS as readonly string[]).includes(key);
}

export type ClaimsParse =
  | { ok: true; claims: Record<string, unknown>; ignored: string[] }
  | { ok: false; error: string };

/** Claim editor text -> override object with reserved keys removed. */
export function parseClaimsOverride(text: string): ClaimsParse {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: true, claims: {}, ignored: [] };
  if (new TextEncoder().encode(trimmed).length > CLAIMS_MAX_BYTES) {
    return { ok: false, error: `Claims are limited to ${CLAIMS_MAX_BYTES} bytes.` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    return {
      ok: false,
      error: `Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`,
    };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, error: "Claims must be a JSON object." };
  }
  const claims: Record<string, unknown> = {};
  const ignored: string[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (isReservedClaim(k)) ignored.push(k);
    else claims[k] = v;
  }
  return { ok: true, claims, ignored };
}

export type TesterForm = {
  /** null = anonymous */
  principalId: string | null;
  claimsText: string;
  operation: TesterOperation;
  table: string;
  schema: string;
  /** PK column -> typed text; all blank = any row */
  pk: Record<string, string>;
  /** PK column -> numeric type (so "42" is sent as 42) */
  pkNumeric?: Record<string, boolean>;
};

export type BuildResult =
  | { ok: true; body: EvaluateRequest }
  | { ok: false; errors: string[] };

export function buildEvaluateRequest(form: TesterForm): BuildResult {
  const errors: string[] = [];
  if (!form.table.trim()) errors.push("Choose a table.");
  if (!(TESTER_OPERATIONS as readonly string[]).includes(form.operation)) {
    errors.push("Choose an operation.");
  }
  const body: EvaluateRequest = {
    operation: form.operation,
    table: form.table.trim(),
    role: form.principalId ? "user" : "anon",
  };
  if (form.schema) body.schema = form.schema;
  if (form.principalId) body.principalId = form.principalId;

  const claims = parseClaimsOverride(form.claimsText);
  if (!claims.ok) errors.push(claims.error);
  else if (Object.keys(claims.claims).length > 0) body.claims = claims.claims;

  const keys = Object.keys(form.pk);
  const filled = keys.filter((k) => (form.pk[k] ?? "").trim() !== "");
  if (filled.length > 0) {
    if (filled.length !== keys.length) {
      errors.push("Fill every primary key field, or clear them all for any row.");
    } else {
      const row: Record<string, string | number> = {};
      for (const k of keys) {
        const v = (form.pk[k] ?? "").trim();
        if (form.pkNumeric?.[k]) {
          const n = Number(v);
          if (!Number.isFinite(n)) {
            errors.push(`${k} must be a number.`);
            continue;
          }
          row[k] = n;
        } else row[k] = v;
      }
      body.row = row;
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, body };
}

export type BodyValidation =
  | { ok: true; body: EvaluateRequest }
  | { ok: false; message: string };

/** BFF-side shape check (the server re-validates). */
export function validateEvaluateBody(input: unknown): BodyValidation {
  if (!isPlainObject(input)) return { ok: false, message: "Body must be a JSON object." };
  const { operation, table } = input;
  if (
    typeof operation !== "string" ||
    !(TESTER_OPERATIONS as readonly string[]).includes(operation)
  ) {
    return { ok: false, message: "operation must be select, insert, update or delete." };
  }
  if (typeof table !== "string" || table.trim() === "" || table.length > 128) {
    return { ok: false, message: "table is required (max 128 chars)." };
  }
  const out: EvaluateRequest = {
    operation: operation as TesterOperation,
    table,
  };
  if (input.schema !== undefined) {
    if (typeof input.schema !== "string" || input.schema.length > 128) {
      return { ok: false, message: "schema must be a string." };
    }
    out.schema = input.schema;
  }
  if (input.principalId !== undefined) {
    if (
      typeof input.principalId !== "string" ||
      input.principalId === "" ||
      input.principalId.length > 128
    ) {
      return { ok: false, message: "principalId must be a non-empty string." };
    }
    out.principalId = input.principalId;
  }
  if (input.role !== undefined) {
    if (input.role !== "user" && input.role !== "anon") {
      return { ok: false, message: "role must be user or anon." };
    }
    out.role = input.role;
  }
  if (input.claims !== undefined) {
    if (!isPlainObject(input.claims)) return { ok: false, message: "claims must be an object." };
    if (JSON.stringify(input.claims).length > CLAIMS_MAX_BYTES) {
      return { ok: false, message: `claims exceed ${CLAIMS_MAX_BYTES} bytes.` };
    }
    out.claims = input.claims;
  }
  if (input.row !== undefined) {
    if (!isPlainObject(input.row)) return { ok: false, message: "row must be an object." };
    const entries = Object.entries(input.row);
    if (entries.length > 16) return { ok: false, message: "row has too many keys." };
    const row: Record<string, string | number> = {};
    for (const [k, v] of entries) {
      if (typeof v !== "string" && typeof v !== "number") {
        return { ok: false, message: "row values must be strings or numbers." };
      }
      row[k] = v;
    }
    out.row = row;
  }
  if (input.values !== undefined) {
    if (!isPlainObject(input.values)) return { ok: false, message: "values must be an object." };
    if (JSON.stringify(input.values).length > 16_384) {
      return { ok: false, message: "values are too large." };
    }
    out.values = input.values;
  }
  return { ok: true, body: out };
}

const REASON_TEXT: Record<string, string> = {
  no_matching_policy_default_deny:
    "No policy matched this request, so it is denied by default.",
  allowed_by_policy: "A policy explicitly allows this request.",
  denied_by_policy: "A policy explicitly denies this request.",
  row_outside_scope:
    "The row falls outside the row scope required by the matching policy.",
  table_not_exposed: "This table is not exposed through the API.",
  user_disabled: "This user is disabled, so real requests with their token are rejected (401).",
};

/** Friendly text for a server reason; unknown reasons are shown verbatim. */
export function reasonText(reason: string): string {
  return REASON_TEXT[reason] ?? reason;
}

export type TesterError = {
  status: number;
  title: string;
  message: string;
  retryable: boolean;
};

/** Map an HTTP status (0 = network failure) + upstream message to UI copy. */
export function describeTesterError(status: number, message?: string): TesterError {
  const m = message?.trim();
  switch (status) {
    case 0:
      return {
        status,
        title: "Network error",
        message: m || "Could not reach Studio. Check your connection.",
        retryable: true,
      };
    case 400:
      return {
        status,
        title: "Invalid request",
        message: m || "The server rejected this test.",
        retryable: false,
      };
    case 401:
    case 403:
      return {
        status,
        title: "Not allowed",
        message: "Only operator admins can run policy tests.",
        retryable: false,
      };
    case 404:
      return {
        status,
        title: "Not found",
        message: m || "The table, user or row was not found.",
        retryable: false,
      };
    case 429:
      return {
        status,
        title: "Rate limited",
        message: "Too many tests. Wait a moment, then retry.",
        retryable: true,
      };
    default:
      return {
        status,
        title: "Test failed",
        message: m || `Request failed (${status}).`,
        retryable: status >= 500,
      };
  }
}

export type HistoryEntry = {
  id: string;
  at: number;
  label: string;
  /** Verdict with a real token. */
  allowed: boolean;
  /** Verdict if a token carried the typed claims; null when none/older server. */
  hypotheticalAllowed: boolean | null;
  request: EvaluateRequest;
};

/** Newest first, capped. Claims are held in memory only. */
export function pushHistory(
  history: readonly HistoryEntry[],
  entry: HistoryEntry,
  cap: number = TESTER_HISTORY_CAP,
): HistoryEntry[] {
  return [entry, ...history].slice(0, cap);
}

export function historyLabel(req: EvaluateRequest, principalLabel: string): string {
  return `${req.operation} ${req.table} as ${principalLabel}${req.row ? " (one row)" : ""}`;
}
