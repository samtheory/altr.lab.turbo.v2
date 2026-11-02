/**
 * Column settings + server-side validation (S0053 / jord-F0024).
 * DDL-facing constraints live in CREATE/ALTER; validation rules +
 * auto-update / comment extras live in `jord_column_settings`.
 * Id strategies (S0054) hang off the same settings object.
 */

import {
  type ColumnForeignKey,
  columnReferencesSql,
  parseColumnForeignKey,
} from "./fk.js";
import {
  type IdStrategy,
  parseIdStrategy,
} from "./id-strategy.js";

export type ColumnDefaultKind =
  | "none"
  | "literal"
  | "expression"
  | "now"
  | "gen_random_uuid";

export type ColumnDefault =
  | { kind: "none" }
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "expression"; sql: string }
  | { kind: "now" }
  | { kind: "gen_random_uuid" };

export type ColumnValidationRules = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  /** ECMA regex source (no flags). */
  pattern?: string;
  enum?: string[];
  minDate?: string;
  maxDate?: string;
};

export type ColumnSettings = {
  /** Explicit nullability. When omitted, DDL uses nullable (legacy). */
  nullable?: boolean;
  default?: ColumnDefault;
  unique?: boolean;
  primaryKey?: boolean;
  autoUpdateTimestamp?: boolean;
  /** Raw CHECK body (without CHECK keyword), column-local. */
  check?: string;
  collation?: string;
  comment?: string;
  validation?: ColumnValidationRules;
  /** Generated id strategy (S0054). */
  idStrategy?: IdStrategy;
  /** Single-column foreign key (S0055). */
  foreignKey?: ColumnForeignKey;
};

export type ColumnSettingsParseError = {
  ok: false;
  error: "invalid_settings";
  message: string;
};

export type FieldValidationFailure = {
  ok: false;
  error: "validation";
  field: string;
  reason: string;
  message: string;
};

const SAFE_EXPR_RE = /^[a-zA-Z0-9_().\s+\-*/%,]+$/;
const SAFE_CHECK_RE = /^[a-zA-Z0-9_().\s+\-*/%<>=!,'"]+$/;
const SAFE_COLLATION_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function emptyColumnSettings(): ColumnSettings {
  return {};
}

export function parseColumnSettings(
  raw: unknown,
): { ok: true; settings: ColumnSettings } | ColumnSettingsParseError {
  if (raw == null) return { ok: true, settings: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      error: "invalid_settings",
      message: "settings must be an object",
    };
  }
  const src = raw as Record<string, unknown>;
  const settings: ColumnSettings = {};

  if (src.nullable !== undefined) {
    if (typeof src.nullable !== "boolean") {
      return failSettings("nullable must be a boolean");
    }
    settings.nullable = src.nullable;
  }

  if (src.unique !== undefined) {
    if (typeof src.unique !== "boolean") {
      return failSettings("unique must be a boolean");
    }
    settings.unique = src.unique;
  }

  if (src.primaryKey !== undefined) {
    if (typeof src.primaryKey !== "boolean") {
      return failSettings("primaryKey must be a boolean");
    }
    settings.primaryKey = src.primaryKey;
  }

  if (src.autoUpdateTimestamp !== undefined) {
    if (typeof src.autoUpdateTimestamp !== "boolean") {
      return failSettings("autoUpdateTimestamp must be a boolean");
    }
    settings.autoUpdateTimestamp = src.autoUpdateTimestamp;
  }

  if (src.check !== undefined) {
    if (typeof src.check !== "string" || src.check.trim() === "") {
      return failSettings("check must be a non-empty string");
    }
    if (!SAFE_CHECK_RE.test(src.check)) {
      return failSettings("check expression contains unsupported characters");
    }
    settings.check = src.check.trim();
  }

  if (src.collation !== undefined) {
    if (typeof src.collation !== "string" || !SAFE_COLLATION_RE.test(src.collation)) {
      return failSettings("collation must be a simple identifier");
    }
    settings.collation = src.collation;
  }

  if (src.comment !== undefined) {
    if (typeof src.comment !== "string") {
      return failSettings("comment must be a string");
    }
    if (src.comment.length > 500) {
      return failSettings("comment must be at most 500 characters");
    }
    settings.comment = src.comment;
  }

  if (src.default !== undefined) {
    const def = parseDefault(src.default);
    if (!def.ok) return def;
    settings.default = def.value;
  }

  if (src.validation !== undefined) {
    const rules = parseValidation(src.validation);
    if (!rules.ok) return rules;
    settings.validation = rules.value;
  }

  if (src.idStrategy !== undefined) {
    const strategy = parseIdStrategy(src.idStrategy);
    if (!strategy.ok) return strategy;
    settings.idStrategy = strategy.strategy;
  }

  if (src.foreignKey !== undefined) {
    const fk = parseColumnForeignKey(src.foreignKey);
    if (!fk.ok) {
      return failSettings(fk.message);
    }
    settings.foreignKey = fk.value;
  }

  return { ok: true, settings };
}

function failSettings(message: string): ColumnSettingsParseError {
  return { ok: false, error: "invalid_settings", message };
}

function parseDefault(
  raw: unknown,
):
  | { ok: true; value: ColumnDefault }
  | ColumnSettingsParseError {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return failSettings("default must be an object with kind");
  }
  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;
  if (kind === "none") return { ok: true, value: { kind: "none" } };
  if (kind === "now") return { ok: true, value: { kind: "now" } };
  if (kind === "gen_random_uuid") {
    return { ok: true, value: { kind: "gen_random_uuid" } };
  }
  if (kind === "literal") {
    const value = obj.value;
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      return failSettings("default.literal value must be a scalar or null");
    }
    return {
      ok: true,
      value: { kind: "literal", value: value as string | number | boolean | null },
    };
  }
  if (kind === "expression") {
    if (typeof obj.sql !== "string" || obj.sql.trim() === "") {
      return failSettings("default.expression needs sql");
    }
    if (!SAFE_EXPR_RE.test(obj.sql)) {
      return failSettings("default expression contains unsupported characters");
    }
    return { ok: true, value: { kind: "expression", sql: obj.sql.trim() } };
  }
  return failSettings(
    "default.kind must be none | literal | expression | now | gen_random_uuid",
  );
}

function parseValidation(
  raw: unknown,
):
  | { ok: true; value: ColumnValidationRules }
  | ColumnSettingsParseError {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return failSettings("validation must be an object");
  }
  const src = raw as Record<string, unknown>;
  const rules: ColumnValidationRules = {};

  for (const key of ["min", "max", "minLength", "maxLength"] as const) {
    if (src[key] !== undefined) {
      if (typeof src[key] !== "number" || !Number.isFinite(src[key])) {
        return failSettings(`${key} must be a finite number`);
      }
      rules[key] = src[key] as number;
    }
  }

  if (src.pattern !== undefined) {
    if (typeof src.pattern !== "string" || src.pattern === "") {
      return failSettings("pattern must be a non-empty string");
    }
    try {
      // eslint-disable-next-line no-new -- validate regex source
      new RegExp(src.pattern);
    } catch {
      return failSettings("pattern is not a valid regular expression");
    }
    rules.pattern = src.pattern;
  }

  if (src.enum !== undefined) {
    if (!Array.isArray(src.enum) || src.enum.length === 0) {
      return failSettings("enum must be a non-empty string array");
    }
    if (!src.enum.every((item) => typeof item === "string")) {
      return failSettings("enum values must be strings");
    }
    rules.enum = src.enum as string[];
  }

  for (const key of ["minDate", "maxDate"] as const) {
    if (src[key] !== undefined) {
      if (typeof src[key] !== "string" || Number.isNaN(Date.parse(src[key] as string))) {
        return failSettings(`${key} must be an ISO date string`);
      }
      rules[key] = src[key] as string;
    }
  }

  if (
    rules.min !== undefined &&
    rules.max !== undefined &&
    rules.min > rules.max
  ) {
    return failSettings("min cannot be greater than max");
  }
  if (
    rules.minLength !== undefined &&
    rules.maxLength !== undefined &&
    rules.minLength > rules.maxLength
  ) {
    return failSettings("minLength cannot be greater than maxLength");
  }

  return { ok: true, value: rules };
}

/** Serialize for jord_column_settings.settings_json. */
export function serializeColumnSettings(settings: ColumnSettings): string {
  return JSON.stringify(settings);
}

export function deserializeColumnSettings(
  json: string,
): { ok: true; settings: ColumnSettings } | ColumnSettingsParseError {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return failSettings("settings_json is not valid JSON");
  }
  return parseColumnSettings(parsed);
}

/**
 * SQL fragments after the type name for CREATE / ADD COLUMN.
 * Does not include the column name or type.
 */
export function columnConstraintSql(
  settings: ColumnSettings | undefined,
  dialect: "libsql" | "postgres",
): string {
  if (!settings) return "";
  const parts: string[] = [];

  if (settings.collation) {
    parts.push(`COLLATE ${settings.collation}`);
  }

  if (settings.default && settings.default.kind !== "none") {
    parts.push(`DEFAULT ${defaultSql(settings.default, dialect)}`);
  }

  if (settings.nullable === false) {
    parts.push("NOT NULL");
  }

  if (settings.unique) {
    parts.push("UNIQUE");
  }

  if (settings.primaryKey) {
    parts.push("PRIMARY KEY");
  }

  if (settings.check) {
    parts.push(`CHECK (${settings.check})`);
  }

  const refs = columnReferencesSql(settings.foreignKey, dialect);
  if (refs) parts.push(refs.trimStart());

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

export function defaultSql(
  def: ColumnDefault,
  dialect: "libsql" | "postgres",
): string {
  switch (def.kind) {
    case "none":
      return "NULL";
    case "now":
      return dialect === "postgres" ? "CURRENT_TIMESTAMP" : "CURRENT_TIMESTAMP";
    case "gen_random_uuid":
      return dialect === "postgres" ? "gen_random_uuid()" : "(lower(hex(randomblob(16))))";
    case "expression":
      return def.sql;
    case "literal":
      return literalSql(def.value);
  }
}

function literalSql(value: string | number | boolean | null): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

/** Postgres COMMENT ON COLUMN statement, or null when no comment. */
export function buildColumnCommentSql(
  schema: string,
  table: string,
  column: string,
  comment: string | undefined,
  quote: (ident: string) => string,
): string | null {
  if (comment === undefined) return null;
  const escaped = comment.replace(/'/g, "''");
  return `COMMENT ON COLUMN ${quote(schema)}.${quote(table)}.${quote(column)} IS '${escaped}'`;
}

export function validateColumnValue(
  field: string,
  value: unknown,
  settings: ColumnSettings | undefined,
): { ok: true } | FieldValidationFailure {
  if (!settings?.validation) return { ok: true };
  const rules = settings.validation;

  if (value === null || value === undefined) {
    return { ok: true };
  }

  if (typeof value === "number") {
    if (rules.min !== undefined && value < rules.min) {
      return fieldFail(field, `must be >= ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      return fieldFail(field, `must be <= ${rules.max}`);
    }
  }

  if (typeof value === "string") {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return fieldFail(field, `length must be >= ${rules.minLength}`);
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return fieldFail(field, `length must be <= ${rules.maxLength}`);
    }
    if (rules.pattern !== undefined) {
      const re = new RegExp(rules.pattern);
      if (!re.test(value)) {
        return fieldFail(field, `must match /${rules.pattern}/`);
      }
    }
    if (rules.enum !== undefined && !rules.enum.includes(value)) {
      return fieldFail(field, `must be one of: ${rules.enum.join(", ")}`);
    }
    if (rules.minDate !== undefined || rules.maxDate !== undefined) {
      const ts = Date.parse(value);
      if (Number.isNaN(ts)) {
        return fieldFail(field, "must be a valid date");
      }
      if (rules.minDate !== undefined && ts < Date.parse(rules.minDate)) {
        return fieldFail(field, `must be on or after ${rules.minDate}`);
      }
      if (rules.maxDate !== undefined && ts > Date.parse(rules.maxDate)) {
        return fieldFail(field, `must be on or before ${rules.maxDate}`);
      }
    }
  }

  return { ok: true };
}

function fieldFail(field: string, reason: string): FieldValidationFailure {
  return {
    ok: false,
    error: "validation",
    field,
    reason,
    message: reason,
  };
}

/** Stamp current time (ms) for columns marked autoUpdateTimestamp. */
export function applyAutoUpdateTimestamps(
  columns: ReadonlyArray<{ name: string; settings?: ColumnSettings }>,
  values: Record<string, unknown>,
  nowMs: number = Date.now(),
): Record<string, unknown> {
  const next = { ...values };
  for (const col of columns) {
    if (col.settings?.autoUpdateTimestamp) {
      next[col.name] = nowMs;
    }
  }
  return next;
}

export type UnsafeDdlKind =
  | "type_change"
  | "drop_column"
  | "drop_table"
  | "not_null_without_default";

export function requiresConfirm(kind: UnsafeDdlKind): string {
  switch (kind) {
    case "type_change":
      return "type change rebuilds the table; pass confirm: true";
    case "drop_column":
      return "dropping a column is destructive; pass confirm: true";
    case "drop_table":
      return "dropping a table is destructive; pass confirm: true";
    case "not_null_without_default":
      return "adding NOT NULL without a default is unsafe; pass confirm: true";
  }
}

export function isNotNullWithoutDefault(settings: ColumnSettings | undefined): boolean {
  if (!settings || settings.nullable !== false) return false;
  const def = settings.default;
  return !def || def.kind === "none";
}
