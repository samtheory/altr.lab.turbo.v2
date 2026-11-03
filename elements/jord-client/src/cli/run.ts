/** `jord` CLI runner. All I/O is injected so it is testable without a network or disk. */
import { basename, isAbsolute } from "node:path";
import { parseArgs } from "node:util";

import { generateTypes, type GenSchema, type GenTable } from "./gen-types.js";

export type CliIo = {
  fetch: typeof fetch;
  readFile: (path: string) => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<void>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  env: Record<string, string | undefined>;
};

const USAGE = `usage: jord gen types --url <server-url> [--schema <name>] [--out <file>] [--check]
  --url     Jord server URL (or JORD_URL)
  --token   bearer token (prefer env JORD_TOKEN / JORD_SERVER_TOKEN)
  --schema  schema to introspect (default: server default)
  --out     write to file (default: stdout)
  --check   exit 1 if --out differs from freshly generated output`;

class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
  ) {
    super(message);
  }
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "<invalid url>";
  }
}

async function getJson(
  io: CliIo,
  base: string,
  path: string,
  token: string | undefined,
): Promise<unknown> {
  let res: Response;
  try {
    res = await io.fetch(base + path, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(15_000),
      // Never follow a redirect with the Authorization header attached.
      redirect: "error",
    });
  } catch (err) {
    const cause =
      err instanceof Error
        ? ((err.cause as { code?: string } | undefined)?.code ?? err.name)
        : "unknown";
    throw new CliError(`cannot reach ${safeOrigin(base)} (${cause})`);
  }
  const route = path.split("?")[0];
  if (res.status === 401 || res.status === 403) {
    throw new CliError(
      `unauthorized (HTTP ${res.status}) at ${safeOrigin(base)}; check --token / JORD_TOKEN`,
    );
  }
  if (!res.ok) throw new CliError(`server returned HTTP ${res.status} for ${route}`);
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new CliError(`response from ${route} is too large`);
  try {
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) throw new CliError(`response from ${route} is too large`);
    return JSON.parse(text) as unknown;
  } catch (err) {
    if (err instanceof CliError) throw err;
    throw new CliError(`invalid JSON from ${route}`);
  }
}

const MAX_BODY_BYTES = 16 * 1024 * 1024;
const MAX_TABLES = 2000;

/** The server is not trusted: reject anything that is not the documented shape. */
function assertTableShape(info: unknown): void {
  const t = info as { name?: unknown; columns?: unknown; schema?: unknown };
  const bad = () => new CliError("unexpected table description from the server");
  if (!t || typeof t !== "object") throw bad();
  if (t.name !== undefined && typeof t.name !== "string") throw bad();
  if (t.schema !== undefined && typeof t.schema !== "string") throw bad();
  if (t.columns !== undefined && !Array.isArray(t.columns)) throw bad();
  for (const c of (t.columns ?? []) as unknown[]) {
    const col = c as { name?: unknown; type?: unknown };
    if (!col || typeof col !== "object") throw bad();
    if (typeof col.name !== "string" || typeof col.type !== "string") throw bad();
  }
}

/** Fetch the snapshot via `GET /schema/tables` then `GET /schema/tables/:name` per table. */
export async function fetchSchema(
  io: CliIo,
  baseUrl: string,
  token: string | undefined,
  schema: string | undefined,
): Promise<GenSchema> {
  const base = baseUrl.replace(/\/+$/, "");
  const q = schema ? `?schema=${encodeURIComponent(schema)}` : "";
  const list = (await getJson(io, base, `/schema/tables${q}`, token)) as {
    tables?: unknown;
  };
  if (!Array.isArray(list.tables)) {
    throw new CliError("unexpected /schema/tables response");
  }
  const tables: GenTable[] = [];
  let resolved = schema;
  if (list.tables.length > MAX_TABLES) {
    throw new CliError(`schema has more than ${MAX_TABLES} tables; narrow it with --schema`);
  }
  for (const name of list.tables as unknown[]) {
    if (typeof name !== "string") throw new CliError("unexpected /schema/tables response");
    const info = (await getJson(
      io,
      base,
      `/schema/tables/${encodeURIComponent(name)}${q}`,
      token,
    )) as GenTable & { schema?: string };
    assertTableShape(info);
    resolved ??= info.schema;
    tables.push({
      name: info.name ?? name,
      columns: info.columns ?? [],
      foreignKeys: info.foreignKeys,
    });
  }
  return { schema: resolved ?? "public", tables };
}

function firstDiff(a: string, b: string): string {
  const x = a.split("\n");
  const y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) {
      return `line ${i + 1}: file has ${JSON.stringify(x[i] ?? "<eof>")}, expected ${JSON.stringify(y[i] ?? "<eof>")}`;
    }
  }
  return "no difference";
}

const norm = (s: string) => s.replace(/\r\n/g, "\n");

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  try {
    let parsed;
    try {
      parsed = parseArgs({
        args: argv,
        allowPositionals: true,
        options: {
          url: { type: "string" },
          token: { type: "string" },
          schema: { type: "string" },
          out: { type: "string" },
          check: { type: "boolean", default: false },
          help: { type: "boolean", short: "h", default: false },
        },
      });
    } catch (err) {
      throw new CliError(`${(err as Error).message}\n${USAGE}`, 2);
    }
    const { values, positionals } = parsed;
    if (values.help) {
      io.stdout(USAGE + "\n");
      return 0;
    }
    if (positionals[0] !== "gen" || positionals[1] !== "types") {
      throw new CliError(USAGE, 2);
    }
    const url = values.url ?? io.env.JORD_URL;
    if (!url) throw new CliError("missing --url (or JORD_URL)", 2);
    if (values.check && !values.out) throw new CliError("--check requires --out", 2);
    const token =
      values.token ?? io.env.JORD_TOKEN ?? io.env.JORD_SERVER_TOKEN ?? undefined;

    const snapshot = await fetchSchema(io, url, token, values.schema);
    const command = [
      "jord gen types",
      `--schema ${snapshot.schema}`,
      ...(values.out ? [`--out ${isAbsolute(values.out) ? basename(values.out) : values.out}`] : []),
    ].join(" ");
    const output = generateTypes(snapshot, { command });

    if (values.check) {
      const existing = await io.readFile(values.out!);
      if (existing === null) {
        io.stderr(`error: ${values.out} does not exist; run: ${command}\n`);
        return 1;
      }
      if (norm(existing) !== output) {
        io.stderr(
          `error: ${values.out} is stale (${firstDiff(norm(existing), output)}); run: ${command}\n`,
        );
        return 1;
      }
      io.stdout(`${values.out} is up to date\n`);
      return 0;
    }
    if (values.out) await io.writeFile(values.out, output);
    else io.stdout(output);
    return 0;
  } catch (err) {
    if (err instanceof CliError) {
      io.stderr(`error: ${err.message}\n`);
      return err.exitCode;
    }
    io.stderr(`error: unexpected failure: ${(err as Error)?.message ?? "unknown"}\n`);
    return 1;
  }
}
