import type { RegistryEntry, TypeParams } from "./types.js";

function emptyParams(): TypeParams {
  return {};
}

function exact(
  sql: string,
  normalize: (s: string) => string = (s) => s.toLowerCase(),
): { render: () => string; parse: (raw: string) => TypeParams | null } {
  const target = normalize(sql);
  return {
    render: () => sql,
    parse: (raw) => (normalize(raw.trim()) === target ? emptyParams() : null),
  };
}

function sized(
  base: string,
  paramName: string,
  opts?: { defaultSize?: number },
): {
  render: (params: TypeParams) => string;
  parse: (raw: string) => TypeParams | null;
} {
  const re = new RegExp(`^${base}\\s*\\(\\s*(\\d+)\\s*\\)$`, "i");
  const bare = new RegExp(`^${base}$`, "i");
  return {
    render: (params) => {
      const n =
        typeof params[paramName] === "number"
          ? params[paramName]
          : opts?.defaultSize;
      if (n == null) return base;
      return `${base}(${n})`;
    },
    parse: (raw) => {
      const t = raw.trim();
      const m = re.exec(t);
      if (m) return { [paramName]: Number(m[1]) };
      if (bare.test(t) && opts?.defaultSize != null) {
        return { [paramName]: opts.defaultSize };
      }
      return null;
    },
  };
}

function numericLike(base: string): {
  render: (params: TypeParams) => string;
  parse: (raw: string) => TypeParams | null;
} {
  const re = new RegExp(
    `^${base}\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)$`,
    "i",
  );
  const bare = new RegExp(`^${base}$`, "i");
  return {
    render: (params) => {
      const p = typeof params.precision === "number" ? params.precision : null;
      const s = typeof params.scale === "number" ? params.scale : null;
      if (p == null) return base;
      if (s == null) return `${base}(${p})`;
      return `${base}(${p},${s})`;
    },
    parse: (raw) => {
      const t = raw.trim();
      const m = re.exec(t);
      if (m) return { precision: Number(m[1]), scale: Number(m[2]) };
      const one = new RegExp(`^${base}\\s*\\(\\s*(\\d+)\\s*\\)$`, "i").exec(t);
      if (one) return { precision: Number(one[1]), scale: 0 };
      if (bare.test(t)) return emptyParams();
      return null;
    },
  };
}

function arrayDialect(): {
  render: (params: TypeParams) => string;
  parse: (raw: string) => TypeParams | null;
} {
  return {
    render: (params) => {
      const el =
        typeof params.element === "string" && params.element.length > 0
          ? params.element
          : "text";
      return `${el}[]`;
    },
    parse: (raw) => {
      const t = raw.trim().toLowerCase();
      const m = /^([a-z_][a-z0-9_]*(?:\([^)]*\))?)\s*\[\s*\]$/.exec(t);
      if (!m) return null;
      return { element: m[1]! };
    },
  };
}

/**
 * Canonical registry. Ids are stable API keys (lowercase).
 * Legacy Studio values TEXT/INTEGER/REAL/BLOB resolve via {@link LEGACY_TYPE_ALIASES}.
 */
export const TYPE_REGISTRY: readonly RegistryEntry[] = [
  // —— strings ——
  {
    id: "text",
    family: "strings",
    label: "Text",
    dialects: {
      libsql: exact("TEXT", (s) => s.toUpperCase()),
      postgres: exact("text"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Text" },
    migratePostgres: "text",
  },
  {
    id: "varchar",
    family: "strings",
    label: "Varchar",
    params: [{ name: "length", kind: "int", required: true, min: 1, default: 255 }],
    dialects: {
      libsql: sized("VARCHAR", "length", { defaultSize: 255 }),
      postgres: sized("varchar", "length", { defaultSize: 255 }),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Varchar", hint: "length" },
    migratePostgres: "text",
  },
  {
    id: "char",
    family: "strings",
    label: "Char",
    params: [{ name: "length", kind: "int", required: true, min: 1, default: 1 }],
    dialects: {
      libsql: sized("CHAR", "length", { defaultSize: 1 }),
      postgres: sized("char", "length", { defaultSize: 1 }),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Char", hint: "length" },
  },
  {
    id: "citext",
    family: "strings",
    label: "Citext",
    dialects: {
      postgres: exact("citext"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Citext (Postgres)" },
  },

  // —— numbers ——
  {
    id: "integer",
    family: "numbers",
    label: "Integer",
    dialects: {
      libsql: exact("INTEGER", (s) => s.toUpperCase()),
      postgres: {
        render: () => "integer",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "integer" || t === "int" || t === "int4"
            ? emptyParams()
            : null;
        },
      },
    },
    codec: { affinity: "INTEGER" },
    ui: { label: "Integer" },
    migratePostgres: "bigint",
  },
  {
    id: "bigint",
    family: "numbers",
    label: "Bigint",
    dialects: {
      libsql: exact("BIGINT", (s) => s.toUpperCase()),
      postgres: {
        render: () => "bigint",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "bigint" || t === "int8" ? emptyParams() : null;
        },
      },
    },
    codec: { affinity: "INTEGER" },
    ui: { label: "Bigint" },
    migratePostgres: "bigint",
  },
  {
    id: "smallint",
    family: "numbers",
    label: "Smallint",
    dialects: {
      libsql: exact("SMALLINT", (s) => s.toUpperCase()),
      postgres: {
        render: () => "smallint",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "smallint" || t === "int2" ? emptyParams() : null;
        },
      },
    },
    codec: { affinity: "INTEGER" },
    ui: { label: "Smallint" },
  },
  {
    id: "real",
    family: "numbers",
    label: "Real",
    dialects: {
      libsql: exact("REAL", (s) => s.toUpperCase()),
      postgres: {
        render: () => "real",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "real" || t === "float4" ? emptyParams() : null;
        },
      },
    },
    codec: { affinity: "REAL" },
    ui: { label: "Real" },
    migratePostgres: "double precision",
  },
  {
    id: "double",
    family: "numbers",
    label: "Double",
    dialects: {
      libsql: {
        render: () => "DOUBLE",
        parse: (raw) => {
          const t = raw.trim().toUpperCase();
          return t === "DOUBLE" || t === "DOUBLE PRECISION"
            ? emptyParams()
            : null;
        },
      },
      postgres: {
        render: () => "double precision",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "double precision" || t === "float8"
            ? emptyParams()
            : null;
        },
      },
    },
    codec: { affinity: "REAL" },
    ui: { label: "Double precision" },
    migratePostgres: "double precision",
  },
  {
    id: "numeric",
    family: "numbers",
    label: "Numeric",
    params: [
      { name: "precision", kind: "int", min: 1 },
      { name: "scale", kind: "int", min: 0 },
    ],
    dialects: {
      libsql: numericLike("NUMERIC"),
      postgres: numericLike("numeric"),
    },
    codec: { affinity: "REAL" },
    ui: { label: "Numeric", hint: "precision, scale" },
  },
  {
    id: "decimal",
    family: "numbers",
    label: "Decimal",
    params: [
      { name: "precision", kind: "int", min: 1 },
      { name: "scale", kind: "int", min: 0 },
    ],
    dialects: {
      libsql: numericLike("DECIMAL"),
      postgres: numericLike("decimal"),
    },
    codec: { affinity: "REAL" },
    ui: { label: "Decimal", hint: "precision, scale" },
  },

  // —— boolean ——
  {
    id: "boolean",
    family: "boolean",
    label: "Boolean",
    dialects: {
      libsql: exact("BOOLEAN", (s) => s.toUpperCase()),
      postgres: exact("boolean"),
    },
    codec: { affinity: "BOOLEAN" },
    ui: { label: "Boolean", hint: "libSQL affinity is integer (0/1)" },
  },

  // —— time ——
  {
    id: "date",
    family: "time",
    label: "Date",
    dialects: {
      libsql: exact("DATE", (s) => s.toUpperCase()),
      postgres: exact("date"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Date" },
  },
  {
    id: "time",
    family: "time",
    label: "Time",
    dialects: {
      libsql: exact("TIME", (s) => s.toUpperCase()),
      postgres: {
        render: () => "time",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          if (t === "time" || t.startsWith("time without time zone")) {
            return emptyParams();
          }
          return null;
        },
      },
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Time" },
  },
  {
    id: "timetz",
    family: "time",
    label: "Time with tz",
    dialects: {
      postgres: {
        render: () => "time with time zone",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "time with time zone" || t === "timetz"
            ? emptyParams()
            : null;
        },
      },
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Timetz (Postgres)" },
  },
  {
    id: "datetime",
    family: "time",
    label: "Datetime",
    dialects: {
      libsql: exact("DATETIME", (s) => s.toUpperCase()),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Datetime (libSQL)" },
  },
  {
    id: "timestamp",
    family: "time",
    label: "Timestamp",
    dialects: {
      libsql: exact("TIMESTAMP", (s) => s.toUpperCase()),
      postgres: {
        render: () => "timestamp",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          if (
            t === "timestamp" ||
            t === "timestamp without time zone" ||
            t.startsWith("timestamp(")
          ) {
            return emptyParams();
          }
          return null;
        },
      },
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Timestamp" },
  },
  {
    id: "timestamptz",
    family: "time",
    label: "Timestamp with tz",
    dialects: {
      postgres: {
        render: () => "timestamptz",
        parse: (raw) => {
          const t = raw.trim().toLowerCase();
          return t === "timestamptz" ||
            t === "timestamp with time zone" ||
            t.startsWith("timestamp with time zone")
            ? emptyParams()
            : null;
        },
      },
    },
    codec: { affinity: "TEXT" },
    ui: { label: "Timestamptz (Postgres)" },
  },

  // —— identity ——
  {
    id: "uuid",
    family: "identity",
    label: "UUID",
    dialects: {
      libsql: exact("UUID", (s) => s.toUpperCase()),
      postgres: exact("uuid"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "UUID" },
  },

  // —— documents ——
  {
    id: "json",
    family: "documents",
    label: "JSON",
    dialects: {
      libsql: exact("JSON", (s) => s.toUpperCase()),
      postgres: exact("json"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "JSON" },
  },
  {
    id: "jsonb",
    family: "documents",
    label: "JSONB",
    dialects: {
      postgres: exact("jsonb"),
    },
    codec: { affinity: "TEXT" },
    ui: { label: "JSONB (Postgres)" },
  },

  // —— binary ——
  {
    id: "blob",
    family: "binary",
    label: "Blob",
    dialects: {
      libsql: exact("BLOB", (s) => s.toUpperCase()),
      postgres: {
        render: () => "bytea",
        parse: (raw) =>
          raw.trim().toLowerCase() === "bytea" ? emptyParams() : null,
      },
    },
    codec: { affinity: "BLOB" },
    ui: { label: "Binary" },
    migratePostgres: "bytea",
  },

  // —— network (Postgres) ——
  {
    id: "inet",
    family: "network",
    label: "Inet",
    dialects: { postgres: exact("inet") },
    codec: { affinity: "TEXT" },
    ui: { label: "Inet (Postgres)" },
  },
  {
    id: "cidr",
    family: "network",
    label: "Cidr",
    dialects: { postgres: exact("cidr") },
    codec: { affinity: "TEXT" },
    ui: { label: "Cidr (Postgres)" },
  },
  {
    id: "macaddr",
    family: "network",
    label: "Macaddr",
    dialects: { postgres: exact("macaddr") },
    codec: { affinity: "TEXT" },
    ui: { label: "Macaddr (Postgres)" },
  },
  {
    id: "array",
    family: "network",
    label: "Array",
    params: [{ name: "element", kind: "string", required: true, default: "text" }],
    dialects: { postgres: arrayDialect() },
    codec: { affinity: "TEXT" },
    ui: { label: "Array (Postgres)", hint: "element type" },
  },

  // —— enumerated (text + check placeholder; native enum is custom until managed) ——
  {
    id: "enum_text",
    family: "enumerated",
    label: "Enum (text + check)",
    dialects: {
      libsql: {
        render: () => "TEXT",
        parse: () => null,
      },
      postgres: {
        render: () => "text",
        parse: () => null,
      },
    },
    codec: { affinity: "TEXT" },
    ui: {
      label: "Enumerated (text)",
      hint: "CHECK constraint is owned by S0053",
    },
  },
];

/** Legacy Studio / API uppercase affinities → registry ids. */
export const LEGACY_TYPE_ALIASES: Record<string, string> = {
  TEXT: "text",
  INTEGER: "integer",
  REAL: "real",
  BLOB: "blob",
};

const byId = new Map(TYPE_REGISTRY.map((e) => [e.id, e]));

export function getTypeEntry(id: string): RegistryEntry | undefined {
  const aliased = LEGACY_TYPE_ALIASES[id] ?? LEGACY_TYPE_ALIASES[id.toUpperCase()];
  return byId.get(aliased ?? id.toLowerCase());
}

export function listTypeEntries(): readonly RegistryEntry[] {
  return TYPE_REGISTRY;
}

export function listTypeIdsForDialect(
  dialect: "libsql" | "postgres",
): string[] {
  return TYPE_REGISTRY.filter((e) => e.dialects[dialect] != null).map(
    (e) => e.id,
  );
}
