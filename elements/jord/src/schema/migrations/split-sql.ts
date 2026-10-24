/**
 * Split a migration file into statements.
 * Comments must be full-line `--` comments. Semicolons inside strings are not supported.
 */
export function splitSqlStatements(sql: string): string[] {
  const body = sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return body
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
