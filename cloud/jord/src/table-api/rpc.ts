/**
 * S0080 — `POST /api/v1/rpc/:fn` with `{ "args": { ... } }`.
 *
 * - `:fn` is a function slug from the functions registry (`jord_functions`,
 *   managed under `/functions`). Unknown / invalid slug → 404 `{ error: "unknown_function" }`.
 * - Exposure: service principals and operator admins may call any function.
 *   Every other caller (user, anon, other operators) may call `:fn` ONLY when a
 *   custom API `POST /x/:fn` exists, points at that function, is enabled and is
 *   not in the `JORD_CUSTOM_API_DISABLED` kill switch (shared `isCustomApiExposed`,
 *   the same decision `/x/:slug` makes). Otherwise the answer is the identical
 *   404 `unknown_function`, so existence is not revealed.
 * - Body must be a JSON object whose only key is `args`; `args` must be a JSON
 *   object (default `{}`). The body is read under the global JSON cap (413).
 * - Authorization: `allowsInvoke(principal)` — the same gate as `/x/:slug`
 *   (`requireInvokeApis`). The function runs with the CALLER's principal through
 *   `runFunction`, exactly like `/x/:slug` and `/functions/:id/invoke`: the step
 *   role is the caller's (`stepRole`), `policyBypass` only for a service caller,
 *   and every step re-checks table policies for that principal. A user or anon
 *   caller is never upgraded to service.
 * - Response: `200 { result }` or `{ error: { code, message } }` with the
 *   runner's status (403 policy_denied, 404 not_found, 503 function_disabled, …).
 *   5xx messages are generic; policy ids are not echoed.
 *
 * No new execution capability: the registry only holds DECLARATIVE functions
 * (built-in step kinds `echo`, `records_list`, `records_get`, `records_insert`,
 * `records_count`). Arbitrary code (Functions v2 worker runtime) stays gated.
 * `args` becomes the step request body; there is no query / path input.
 */
import type { JordDriverPort } from "@altr/jord";
import type { Context } from "hono";

import { allowsInvoke } from "../auth/access.js";
import type { JordAuthVariables } from "../auth/middleware.js";
import type { Principal } from "../auth/principal.js";
import type { JordRole } from "../auth/roles.js";
import { isCustomApiExposed } from "../functions/exposure.js";
import { runFunction } from "../functions/runner.js";
import { isValidApiSlug } from "../functions/slug.js";
import type { LogSink } from "../logs/sink.js";
import type { WriteWithChange } from "../realtime/types.js";
import { readJsonCapped } from "./body.js";
import { TableApiError } from "./query.js";

export type RpcDeps = {
  jord: JordDriverPort;
  writeChangeAs: (principal: Principal) => WriteWithChange;
  maxJsonBytes: number;
  runner: {
    enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
    logs?: LogSink;
    stepRole: (principal: Principal) => JordRole;
    /** `JORD_CUSTOM_API_DISABLED` kill switch (ids / slugs), same set `/x/:slug` uses. */
    customApiDisabled?: Set<string>;
  } | null;
};

function rpcError(c: Context, status: number, code: string, message: string): Response {
  return c.json({ error: { code, message } }, status as 400);
}

export async function handleRpc(
  c: Context<{ Variables: JordAuthVariables }>,
  deps: RpcDeps,
): Promise<Response> {
  const principal = c.get("principal");
  if (!allowsInvoke(principal)) {
    return rpcError(c, 403, "forbidden", "role cannot invoke functions");
  }
  const slug = c.req.param("fn") ?? "";
  // One body for every "cannot call this" case so existence is never revealed.
  const unknown = () => c.json({ error: "unknown_function" }, 404);
  if (!deps.runner || !isValidApiSlug(slug)) return unknown();
  const fn = await deps.jord.getFunctionBySlug(slug);
  if (!fn) return unknown();
  if (!(principal.kind === "service" || (principal.kind === "operator" && principal.role === "admin"))) {
    const api = await deps.jord.getCustomApiByMethodSlug("POST", slug);
    if (
      !api ||
      api.functionId !== fn.id ||
      !isCustomApiExposed(api, deps.runner.customApiDisabled ?? new Set())
    ) {
      return unknown();
    }
  }

  let body: unknown;
  try {
    body = await readJsonCapped(c.req, deps.maxJsonBytes);
  } catch (err) {
    if (err instanceof TableApiError) return rpcError(c, err.status, err.code, err.message);
    throw err;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return rpcError(c, 400, "bad_body", "JSON object { args } is required");
  }
  const extra = Object.keys(body).filter((key) => key !== "args");
  if (extra.length > 0) {
    return rpcError(c, 400, "bad_body", "only args is accepted");
  }
  const args = (body as { args?: unknown }).args ?? {};
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return rpcError(c, 400, "bad_args", "args must be a JSON object");
  }

  const run = await runFunction({
    jord: deps.jord,
    fn,
    role: deps.runner.stepRole(principal),
    policyBypass: principal.kind === "service",
    subject: principal.kind,
    uid: principal.uid ?? null,
    enqueueWrite: deps.runner.enqueueWrite,
    logs: deps.runner.logs,
    writeChange: deps.writeChangeAs(principal),
    request: {
      method: "POST",
      path: `/api/v1/rpc/${slug}`,
      slug,
      params: { slug },
      query: {},
      body: args,
    },
  });
  if (!run.ok) {
    const message =
      run.status >= 500 && run.error !== "function_disabled"
        ? "function failed"
        : run.error === "policy_denied"
          ? "policy denied"
          : run.message;
    return rpcError(c, run.status, run.error, message);
  }
  return c.json({ result: run.result }, 200);
}
