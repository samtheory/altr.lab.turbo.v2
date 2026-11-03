/**
 * Shared client-snippet generators (S0086). ONE module used by the dashboard connect card and the
 * realtime snippet panel. Pure strings only: the output may contain the publishable key (when the
 * caller just rotated and holds it) or a placeholder, and NEVER a secret/barrier key.
 *
 * Contract mirrored (S0084): `/p/:project/realtime`, publishable key in `x-jord-key` (or `apikey`),
 * `?apikey=` ONLY on the WebSocket upgrade, SSE fallback takes `table`, `filter` (JSON), `since`,
 * `limit` as query params, secret keys are rejected with 401 `secret_key_not_allowed`.
 */

export const ENV_NAMES = {
  url: "JORD_URL",
  project: "JORD_PROJECT",
  publishableKey: "JORD_PUBLISHABLE_KEY",
} as const;

export const PUBLISHABLE_PLACEHOLDER = "<publishable key>";

export const SECRET_KEY_NOTE =
  "The secret key is server-only and is rejected by this endpoint (401 secret_key_not_allowed). Use the publishable key.";

export const REALTIME_LANGS = ["js", "python", "curl"] as const;
export type RealtimeLang = (typeof REALTIME_LANGS)[number];

export const REALTIME_LANG_LABELS: Record<RealtimeLang, string> = {
  js: "JS / TS",
  python: "Python",
  curl: "cURL",
};

export type SnippetFilter = Record<string, string>;

export type SnippetOpts = {
  /** Table to subscribe to. */
  table: string;
  /** Optional equality filter, e.g. `{ status: "open" }`. A commented example is shown when absent. */
  filter?: SnippetFilter | null;
  /** Publishable key if the caller holds one (fresh rotation). Otherwise a placeholder is used. */
  publishableKey?: string | null;
  /** Server base URL / project slug used for the shell exports of the cURL snippet. */
  url?: string;
  project?: string;
};

/** Channel name shown in the APIs drawer: `p:<project>:<schema>.<table>`. */
export function projectChannelName(project: string, schema: string | null | undefined, table: string): string {
  const s = schema && schema.length > 0 ? schema : "public";
  return `p:${project}:${s}.${table}`;
}

/** `.env` block. The secret key is deliberately not listed. */
export function buildEnvBlock(opts: {
  url: string;
  publishableKey: string | null;
  slug: string;
}): string {
  return [
    `${ENV_NAMES.url}=${opts.url}`,
    `${ENV_NAMES.project}=${opts.slug}`,
    `${ENV_NAMES.publishableKey}=${opts.publishableKey ?? PUBLISHABLE_PLACEHOLDER}`,
    "# The secret key is server-only: never put it in a browser or mobile app.",
  ].join("\n");
}

/** Data client init (connect card "Client init" tab). */
export function buildClientSnippet(opts: { publishableKey: string | null }): string {
  return `import { createJordClient } from "@altr/jord-client";

const jord = createJordClient({
  url: process.env.${ENV_NAMES.url}!,
  publishableKey: process.env.${ENV_NAMES.publishableKey} ?? "${opts.publishableKey ?? PUBLISHABLE_PLACEHOLDER}",
});`;
}

function shellQuote(v: string): string {
  return `'${v.replace(/'/g, `'\\''`)}'`;
}

function keyOrPlaceholder(k: string | null | undefined): string {
  return k && k.length > 0 ? k : PUBLISHABLE_PLACEHOLDER;
}

export function buildJsRealtimeSnippet(o: SnippetOpts): string {
  const table = JSON.stringify(o.table);
  const filterLine = o.filter && Object.keys(o.filter).length > 0
    ? `  filter: ${JSON.stringify(o.filter)},`
    : `  // filter: { status: "open" }, // optional equality filter (max 4 predicates)`;
  const keyExpr = o.publishableKey
    ? `process.env.${ENV_NAMES.publishableKey} ?? ${JSON.stringify(o.publishableKey)}`
    : `process.env.${ENV_NAMES.publishableKey}!`;
  return `// ${SECRET_KEY_NOTE}
import { createRealtime } from "@altr/jord-client";

// Browser: the global WebSocket cannot send headers, so createRealtime puts the
// publishable key in \`?apikey=\` on the WebSocket upgrade URL ONLY. Query strings can
// land in proxy / access logs: use the publishable key (never a secret) and rotate
// it if logs leak. Node: pass \`WebSocket\` from the "ws" package and the key is sent
// in the \`x-jord-key\` header instead.
const realtime = createRealtime({
  url: process.env.${ENV_NAMES.url}!,
  project: process.env.${ENV_NAMES.project}!,
  key: ${keyExpr},
});

const sub = realtime.subscribe({
  table: ${table},
${filterLine}
  // Fresh base state: replace local rows (initial, resync or reconnect).
  onSnapshot: ({ rows, cursor, truncated, reason }) => {
    console.log("snapshot", reason, rows.length, "rows", { cursor, truncated });
  },
  // Deltas: strictly increasing seq; op "delete" with row null also means "left your filter".
  onChange: (change) => {
    console.log(change.op, change.seq, change.row);
  },
  // connecting | live | degraded | resync | closed
  onState: ({ state, reason }) => console.log("state", state, reason ?? ""),
  onError: ({ code, message, retryable }) => console.error(code, message, retryable),
});

// Later: stop this subscription, then release every socket.
sub.unsubscribe();
realtime.close();`;
}

export function buildPythonRealtimeSnippet(o: SnippetOpts): string {
  const pyKey = o.publishableKey
    ? `os.environ.get("${ENV_NAMES.publishableKey}", ${JSON.stringify(o.publishableKey)})`
    : `os.environ["${ENV_NAMES.publishableKey}"]`;
  const table = JSON.stringify(o.table);
  const filter = o.filter && Object.keys(o.filter).length > 0
    ? `    "filter": ${JSON.stringify(o.filter)},`
    : `    # "filter": {"status": "open"},  # optional equality filter (max 4 predicates)`;
  return `# ${SECRET_KEY_NOTE}
# pip install websockets   (>= 14 uses additional_headers; older releases call it extra_headers)
import asyncio
import json
import os

import websockets

URL = os.environ["${ENV_NAMES.url}"].rstrip("/").replace("http", "ws", 1)
PROJECT = os.environ["${ENV_NAMES.project}"]
KEY = ${pyKey}  # publishable key only

SUBSCRIBE = {
    "type": "subscribe",
    "table": ${table},
${filter}
    "limit": 100,
}


async def main() -> None:
    uri = f"{URL}/p/{PROJECT}/realtime"
    async with websockets.connect(uri, additional_headers={"x-jord-key": KEY}) as ws:
        async for raw in ws:
            frame = json.loads(raw)
            kind = frame.get("type")
            if kind == "ready":
                await ws.send(json.dumps(SUBSCRIBE))
            elif kind == "snapshot":
                print("snapshot", len(frame["rows"]), "rows, cursor", frame["cursor"])
            elif kind == "subscribed":
                print("resumed at cursor", frame["cursor"])
            elif kind == "jord.change":
                print(frame["op"], frame["seq"], frame["row"])
            elif kind == "resync":
                # Cursor too old: drop local state and reconnect WITHOUT "since".
                print("resync required")
                return
            elif kind == "error":
                print("error", frame.get("status"), frame.get("error"))
                return
            elif kind == "ping":
                await ws.send(json.dumps({"type": "pong"}))
        # Leaving the "async with" block closes the socket = unsubscribe.


asyncio.run(main())`;
}

export function buildCurlRealtimeSnippet(o: SnippetOpts): string {
  const filter = o.filter && Object.keys(o.filter).length > 0
    ? `  --data-urlencode ${shellQuote(`filter=${JSON.stringify(o.filter)}`)} \\\n`
    : `  # --data-urlencode 'filter={"status":"open"}' \\\n`;
  return `# ${SECRET_KEY_NOTE}
# SSE fallback: the key goes in the x-jord-key HEADER (a ?apikey= query is rejected with 400 on SSE).
# Events: snapshot, jord.change, resync, error, ping. Press Ctrl+C to unsubscribe.
export ${ENV_NAMES.url}=${shellQuote(o.url ?? "http://127.0.0.1:8787")}
export ${ENV_NAMES.project}=${shellQuote(o.project ?? "my-project")}
export ${ENV_NAMES.publishableKey}=${keyOrPlaceholder(o.publishableKey) === PUBLISHABLE_PLACEHOLDER ? `'${PUBLISHABLE_PLACEHOLDER}'` : shellQuote(keyOrPlaceholder(o.publishableKey))}

curl -N -G "$${ENV_NAMES.url}/p/$${ENV_NAMES.project}/realtime" \\
  -H "x-jord-key: $${ENV_NAMES.publishableKey}" \\
  -H "Accept: text/event-stream" \\
  --data-urlencode ${shellQuote(`table=${o.table}`)} \\
${filter}  --data-urlencode "limit=100"`;
}

export function buildRealtimeSnippet(lang: RealtimeLang, o: SnippetOpts): string {
  switch (lang) {
    case "js":
      return buildJsRealtimeSnippet(o);
    case "python":
      return buildPythonRealtimeSnippet(o);
    case "curl":
      return buildCurlRealtimeSnippet(o);
  }
}
