import { validateColumnValue } from "@altr/jord";

import { coerceColumnValue, TableApiError, type SqlValue } from "./query.js";

/**
 * Column allowlist + S0053 validation + scalar coercion for one write body.
 * Shared by single-row POST/PATCH (`routes.ts`) and bulk (`bulk.ts`, S0080) so
 * both paths accept exactly the same columns and values.
 */
export function coerceBody(
  info: {
    columns: Array<{
      name: string;
      type: string;
      notnull: boolean;
      pk: boolean;
      dflt_value: string | null;
      settings?: Parameters<typeof validateColumnValue>[2];
    }>;
  },
  body: Record<string, unknown>,
): Record<string, SqlValue> {
  const out: Record<string, SqlValue> = {};
  for (const [key, value] of Object.entries(body)) {
    const col = info.columns.find((item) => item.name === key);
    if (!col) throw new TableApiError(400, "bad_column", `unknown column ${key}`);
    const ruled = validateColumnValue(key, value, col.settings);
    if (!ruled.ok) {
      throw new TableApiError(422, "validation", ruled.reason, {
        field: ruled.field,
        reason: ruled.reason,
      });
    }
    if (value == null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "number") {
      out[key] = coerceColumnValue(col, String(value));
      continue;
    }
    if (typeof value === "string") {
      out[key] = coerceColumnValue(col, value);
      continue;
    }
    throw new TableApiError(400, "bad_value", `${key} must be a scalar`);
  }
  return out;
}

/** Comma-joined primary-key values: the change-event / result id. */
export function rowId(keys: string[], row: Record<string, unknown>): string {
  return keys.map((key) => String(row[key] ?? "")).join(",");
}

/**
 * Read a JSON request body with a hard byte cap (the global JSON cap). The
 * body-limit middleware only checks Content-Length; this also covers chunked
 * bodies. Over the cap → 413, not JSON → 400.
 */
export async function readJsonCapped(
  req: { raw: Request; arrayBuffer: () => Promise<ArrayBuffer> },
  maxBytes: number,
): Promise<unknown> {
  const tooLarge = () =>
    new TableApiError(413, "payload_too_large", `body exceeds ${maxBytes} bytes`);
  let bytes: Uint8Array;
  const stream = !req.raw.bodyUsed ? req.raw.body : null;
  if (stream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw tooLarge();
      }
      chunks.push(value);
    }
    bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
  } else {
    bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > maxBytes) throw tooLarge();
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new TableApiError(400, "bad_body", "body is not valid JSON");
  }
}
