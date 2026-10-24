import { createHash } from "node:crypto";

/** SHA-256 hex (lowercase) of the migration file after CRLF → LF. */
export function migrationChecksum(sql: string): string {
  const normalized = sql.replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
