/**
 * Generated id strategies (S0054 / jord-F0024).
 * SQL-backed where the dialect allows; otherwise app-side on insert.
 */

import { randomBytes, randomUUID } from "node:crypto";

export type IdStrategy =
  | { kind: "identity"; mode?: "always" | "by_default" }
  | { kind: "serial" }
  | { kind: "sequence"; name: string }
  | { kind: "uuid_v4" }
  | { kind: "uuid_v7" }
  | { kind: "ulid" }
  | { kind: "nanoid"; size?: number }
  | { kind: "cuid2" }
  | { kind: "custom"; expression: string };

export type IdStrategyParseError = {
  ok: false;
  error: "invalid_settings";
  message: string;
};

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const SAFE_EXPR_RE = /^[a-zA-Z0-9_().\s+\-*/%,]+$/;

export function parseIdStrategy(
  raw: unknown,
): { ok: true; strategy: IdStrategy } | IdStrategyParseError {
  if (raw == null) {
    return { ok: false, error: "invalid_settings", message: "idStrategy is required when set" };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_settings", message: "idStrategy must be an object" };
  }
  const src = raw as Record<string, unknown>;
  const kind = src.kind;
  switch (kind) {
    case "identity": {
      const mode = src.mode;
      if (mode !== undefined && mode !== "always" && mode !== "by_default") {
        return fail("idStrategy.identity.mode must be always | by_default");
      }
      return {
        ok: true,
        strategy: { kind: "identity", mode: (mode as "always" | "by_default") ?? "by_default" },
      };
    }
    case "serial":
      return { ok: true, strategy: { kind: "serial" } };
    case "sequence": {
      if (typeof src.name !== "string" || !IDENT_RE.test(src.name)) {
        return fail("idStrategy.sequence needs a valid name");
      }
      return { ok: true, strategy: { kind: "sequence", name: src.name } };
    }
    case "uuid_v4":
      return { ok: true, strategy: { kind: "uuid_v4" } };
    case "uuid_v7":
      return { ok: true, strategy: { kind: "uuid_v7" } };
    case "ulid":
      return { ok: true, strategy: { kind: "ulid" } };
    case "nanoid": {
      const size = src.size === undefined ? 21 : Number(src.size);
      if (!Number.isInteger(size) || size < 8 || size > 64) {
        return fail("idStrategy.nanoid.size must be an integer 8–64");
      }
      return { ok: true, strategy: { kind: "nanoid", size } };
    }
    case "cuid2":
      return { ok: true, strategy: { kind: "cuid2" } };
    case "custom": {
      if (typeof src.expression !== "string" || !SAFE_EXPR_RE.test(src.expression)) {
        return fail("idStrategy.custom.expression is missing or unsafe");
      }
      return { ok: true, strategy: { kind: "custom", expression: src.expression.trim() } };
    }
    default:
      return fail(
        "idStrategy.kind must be identity|serial|sequence|uuid_v4|uuid_v7|ulid|nanoid|cuid2|custom",
      );
  }
}

function fail(message: string): IdStrategyParseError {
  return { ok: false, error: "invalid_settings", message };
}

/** Whether inserts may omit this column (engine or app fills it). */
export function idStrategyAllowsOmittedValue(strategy: IdStrategy | undefined): boolean {
  return strategy != null;
}

/**
 * DDL fragments after the type for strategies that belong in SQL.
 * Returns empty string when generation is app-side only.
 */
export function idStrategyDdl(
  strategy: IdStrategy | undefined,
  dialect: "libsql" | "postgres",
  columnType: string,
): { fragment: string; appSide: boolean; unsupported?: string } {
  if (!strategy) return { fragment: "", appSide: false };

  if (strategy.kind === "identity") {
    if (dialect === "postgres") {
      const mode = strategy.mode === "always" ? "ALWAYS" : "BY DEFAULT";
      return {
        fragment: ` GENERATED ${mode} AS IDENTITY`,
        appSide: false,
      };
    }
    if (!/INT/i.test(columnType)) {
      return {
        fragment: "",
        appSide: false,
        unsupported: "libSQL identity requires an INTEGER column (use AUTOINCREMENT)",
      };
    }
    return { fragment: " PRIMARY KEY AUTOINCREMENT", appSide: false };
  }

  if (strategy.kind === "serial") {
    if (dialect === "postgres") {
      return { fragment: "", appSide: false }; // type becomes SERIAL via caller
    }
    if (!/INT/i.test(columnType)) {
      return {
        fragment: "",
        appSide: false,
        unsupported: "libSQL serial requires an INTEGER column",
      };
    }
    return { fragment: " PRIMARY KEY AUTOINCREMENT", appSide: false };
  }

  if (strategy.kind === "sequence") {
    if (dialect === "postgres") {
      return {
        fragment: ` DEFAULT nextval('${strategy.name.replace(/'/g, "''")}')`,
        appSide: false,
      };
    }
    return {
      fragment: "",
      appSide: true,
      unsupported: undefined, // app-side counter fallback via generateId
    };
  }

  if (strategy.kind === "custom") {
    return { fragment: ` DEFAULT ${strategy.expression}`, appSide: false };
  }

  if (strategy.kind === "uuid_v4" && dialect === "postgres") {
    return { fragment: " DEFAULT gen_random_uuid()", appSide: false };
  }

  // uuid_v7 / ulid / nanoid / cuid2 / libSQL uuid_v4 → app-side
  return { fragment: "", appSide: true };
}

/** Postgres type override for serial strategy. */
export function postgresSerialType(strategy: IdStrategy | undefined): string | null {
  return strategy?.kind === "serial" ? "SERIAL" : null;
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const NANO_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generateId(strategy: IdStrategy, nowMs: number = Date.now()): string | number {
  switch (strategy.kind) {
    case "uuid_v4":
      return randomUUID();
    case "uuid_v7":
      return uuidV7(nowMs);
    case "ulid":
      return ulid(nowMs);
    case "nanoid":
      return nanoid(strategy.size ?? 21);
    case "cuid2":
      return cuid2();
    case "sequence":
      // App-side fallback when SQL sequence is unavailable (libSQL).
      return `${strategy.name}_${nowMs}_${randomBytes(3).toString("hex")}`;
    case "identity":
    case "serial":
    case "custom":
      throw new Error(
        `[@altr/jord] id strategy ${strategy.kind} is SQL-backed; do not generate in-app`,
      );
  }
}

function uuidV7(nowMs: number): string {
  const bytes = randomBytes(16);
  const ts = BigInt(nowMs);
  bytes[0] = Number((ts >> 40n) & 0xffn);
  bytes[1] = Number((ts >> 32n) & 0xffn);
  bytes[2] = Number((ts >> 24n) & 0xffn);
  bytes[3] = Number((ts >> 16n) & 0xffn);
  bytes[4] = Number((ts >> 8n) & 0xffn);
  bytes[5] = Number(ts & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function ulid(nowMs: number): string {
  let time = nowMs;
  let out = "";
  for (let i = 0; i < 10; i++) {
    out = CROCKFORD[time % 32]! + out;
    time = Math.floor(time / 32);
  }
  const rand = randomBytes(10);
  for (let i = 0; i < 16; i++) {
    const byte = rand[i % 10]!;
    out += CROCKFORD[byte % 32]!;
  }
  return out;
}

function nanoid(size: number): string {
  const bytes = randomBytes(size);
  let out = "";
  for (let i = 0; i < size; i++) {
    out += NANO_ALPHABET[bytes[i]! % NANO_ALPHABET.length]!;
  }
  return out;
}

function cuid2(): string {
  // Compact cuid2-like: timestamp + entropy (not full cuid2 spec; unique under concurrency).
  return `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;
}
