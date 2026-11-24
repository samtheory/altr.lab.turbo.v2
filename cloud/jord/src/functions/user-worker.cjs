"use strict";
/**
 * S0090/S0091 — Functions v2 user-handler bootstrap (worker_thread).
 * Plain CommonJS so it loads under tsx / vitest / node without a transpile step.
 *
 * Protocol (parent ↔ worker):
 *   ready  ← { type: "ready" }
 *   invoke → { type: "invoke", requestId, modulePath, exportName?, input, maxOutputBytes }
 *   jord_rpc → { type: "jord_rpc", requestId, rpcId, op, args }   (worker → parent)
 *   jord_rpc_result ← { type: "jord_rpc_result", requestId, rpcId, ok, result|error, code?, status? }
 *   result ← { type: "result", requestId, ok, result?, error?, code?, console? }
 *
 * Env is whatever the parent passed via Worker `env` (allowlist + OS-minimal).
 */
const { parentPort, workerData } = require("node:worker_threads");
const path = require("node:path");
const fs = require("node:fs");
const { AsyncLocalStorage } = require("node:async_hooks");

if (!parentPort) {
  throw new Error("user-worker must run as a worker_thread");
}

const moduleRoots = Array.isArray(workerData?.moduleRoots)
  ? workerData.moduleRoots.map((p) => path.resolve(String(p)))
  : [];

const invokeStore = new AsyncLocalStorage();

/** rpcId → { resolve, reject } for in-flight parent RPCs on this worker. */
const rpcPending = new Map();

function isUnderRoot(absPath) {
  const resolved = path.resolve(absPath);
  for (const root of moduleRoots) {
    const prefix = root.endsWith(path.sep) ? root : root + path.sep;
    if (resolved === root || resolved.startsWith(prefix)) return true;
  }
  return false;
}

function loadHandler(modulePath, exportName) {
  const abs = path.resolve(modulePath);
  if (!isUnderRoot(abs)) {
    const err = new Error("module path outside allowlisted roots");
    err.code = "function_module_denied";
    throw err;
  }
  if (!fs.existsSync(abs)) {
    const err = new Error(`module not found: ${abs}`);
    err.code = "function_module_missing";
    throw err;
  }
  try {
    delete require.cache[require.resolve(abs)];
  } catch {
    /* first load */
  }
  const mod = require(abs);
  const name = exportName && String(exportName).length > 0 ? String(exportName) : "default";
  let handler = mod;
  if (mod && typeof mod === "object") {
    handler = name === "default" ? (mod.default ?? mod.handler ?? mod) : mod[name];
  }
  if (typeof handler !== "function") {
    const err = new Error(`export "${name}" is not a function`);
    err.code = "function_bad_export";
    throw err;
  }
  return handler;
}

function serializeResult(value, maxOutputBytes) {
  let json;
  try {
    json = JSON.stringify(value === undefined ? null : value);
  } catch (err) {
    const e = new Error(err instanceof Error ? err.message : "result not JSON-serializable");
    e.code = "function_bad_result";
    throw e;
  }
  if (Buffer.byteLength(json, "utf8") > maxOutputBytes) {
    const e = new Error(`result exceeds ${maxOutputBytes} bytes`);
    e.code = "function_output_too_large";
    throw e;
  }
  return JSON.parse(json);
}

function createJordClient(requestId) {
  let seq = 0;
  function rpc(op, args) {
    const rpcId = `${requestId}:${++seq}`;
    return new Promise((resolve, reject) => {
      rpcPending.set(rpcId, { resolve, reject });
      parentPort.postMessage({
        type: "jord_rpc",
        requestId,
        rpcId,
        op,
        args: args ?? {},
      });
    });
  }
  return {
    from(table) {
      const tableName = String(table);
      return {
        select: (opts) => rpc("table.select", { table: tableName, ...(opts || {}) }),
        insert: (row) => rpc("table.insert", { table: tableName, row }),
        update: (id, patch) => rpc("table.update", { table: tableName, id, patch }),
        delete: (id) => rpc("table.delete", { table: tableName, id }),
      };
    },
    signBlob: (opts) => rpc("blob.sign", opts || {}),
  };
}

function installConsoleCapture(bucket) {
  const levels = ["log", "info", "warn", "error", "debug"];
  const originals = {};
  for (const level of levels) {
    originals[level] = console[level].bind(console);
    // Capture only — do not forward to the parent process stdout (secrets).
    console[level] = (...args) => {
      const line = args
        .map((a) => {
          if (typeof a === "string") return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
      if (bucket.length < 80) bucket.push(line);
    };
  }
  return () => {
    for (const level of levels) console[level] = originals[level];
  };
}

parentPort.on("message", async (msg) => {
  if (!msg || typeof msg !== "object") return;

  if (msg.type === "jord_rpc_result" && typeof msg.rpcId === "string") {
    const pending = rpcPending.get(msg.rpcId);
    if (!pending) return;
    rpcPending.delete(msg.rpcId);
    if (msg.ok) pending.resolve(msg.result ?? null);
    else {
      const err = new Error(msg.error || "jord rpc failed");
      err.code = msg.code || "function_rpc_failed";
      err.status = msg.status || 500;
      pending.reject(err);
    }
    return;
  }

  if (msg.type !== "invoke" || typeof msg.requestId !== "string") return;
  const requestId = msg.requestId;
  const consoleBucket = [];
  const restoreConsole = installConsoleCapture(consoleBucket);

  try {
    const handler = loadHandler(msg.modulePath, msg.exportName);
    const jord = createJordClient(requestId);
    const result = await invokeStore.run({ requestId }, () =>
      handler(msg.input, { jord }),
    );
    const safe = serializeResult(result, Number(msg.maxOutputBytes) || 1_048_576);
    parentPort.postMessage({
      type: "result",
      requestId,
      ok: true,
      result: safe,
      console: consoleBucket.slice(),
    });
  } catch (err) {
    const code =
      err && typeof err === "object" && typeof err.code === "string"
        ? err.code
        : "function_crashed";
    const error = err instanceof Error ? err.message : "handler failed";
    parentPort.postMessage({
      type: "result",
      requestId,
      ok: false,
      error,
      code,
      status: err && typeof err === "object" && typeof err.status === "number" ? err.status : undefined,
      console: consoleBucket.slice(),
    });
  } finally {
    restoreConsole();
  }
});

parentPort.postMessage({ type: "ready" });
