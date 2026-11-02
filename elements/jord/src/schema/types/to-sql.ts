import { getTypeEntry } from "./registry.js";
import type { JordDialect, TypeParams } from "./types.js";

export type ToSqlResult =
  | { ok: true; sql: string; id: string; params: TypeParams }
  | { ok: false; error: "unknown_type" | "unsupported_dialect"; message: string };

function applyDefaults(
  params: TypeParams | undefined,
  defs:
    | readonly { name: string; default?: number | string }[]
    | undefined,
): TypeParams {
  const out: TypeParams = { ...(params ?? {}) };
  if (!defs) return out;
  for (const d of defs) {
    if (out[d.name] == null && d.default != null) {
      out[d.name] = d.default;
    }
  }
  return out;
}

/**
 * Render a registry type id (+ optional params) to a dialect SQL fragment.
 * Accepts legacy uppercase affinities (`TEXT`, …) via aliases.
 */
export function toSql(
  dialect: JordDialect,
  id: string,
  params?: TypeParams,
): ToSqlResult {
  const entry = getTypeEntry(id);
  if (!entry) {
    return {
      ok: false,
      error: "unknown_type",
      message: `unknown column type ${JSON.stringify(id)}`,
    };
  }
  const dialectSql = entry.dialects[dialect];
  if (!dialectSql) {
    return {
      ok: false,
      error: "unsupported_dialect",
      message: `type ${entry.id} is not supported on ${dialect}`,
    };
  }
  const resolved = applyDefaults(params, entry.params);
  return {
    ok: true,
    sql: dialectSql.render(resolved),
    id: entry.id,
    params: resolved,
  };
}
