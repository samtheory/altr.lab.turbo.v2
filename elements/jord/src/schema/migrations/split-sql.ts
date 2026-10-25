/**
 * Split a migration file into statements.
 * Comments must be full-line `--` comments. Semicolons inside single-quoted
 * strings and Postgres dollar-quoted bodies (`$$ … $$`, `$tag$ … $tag$`) are kept.
 */
export function splitSqlStatements(sql: string): string[] {
  const body = sql
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements: string[] = [];
  let current = "";
  let i = 0;
  while (i < body.length) {
    const ch = body[i]!;
    if (ch === "'") {
      const end = findQuoteEnd(body, i);
      current += body.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(body.slice(i))?.[0];
      if (tag) {
        const close = body.indexOf(tag, i + tag.length);
        const end = close === -1 ? body.length : close + tag.length;
        current += body.slice(i, end);
        i = end;
        continue;
      }
    }
    if (ch === ";") {
      statements.push(current);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  statements.push(current);
  return statements.map((part) => part.trim()).filter((part) => part.length > 0);
}

function findQuoteEnd(body: string, start: number): number {
  let i = start + 1;
  while (i < body.length) {
    if (body[i] === "'") {
      if (body[i + 1] === "'") {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return body.length;
}
