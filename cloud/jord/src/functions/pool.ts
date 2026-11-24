/**
 * S0090/S0091 — `worker_threads` pool for user function handlers.
 * Built-in step kinds stay on `runner.ts`; this path is only for user modules.
 * S0091 adds parent-mediated principal RPCs + invocation logs.
 */
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import type { LogSink } from "../logs/sink.js";
import {
  appendInvocationLog,
  statusFromFailureCode,
} from "./invocation-log.js";
import {
  executeFunctionRpc,
  isFunctionRpcOp,
  FunctionRpcError,
  type FunctionPrincipal,
  type FunctionRpcDeps,
} from "./principal-client.js";
import {
  buildWorkerEnv,
  clampPoolConfig,
  type FunctionPoolConfig,
} from "./pool-limits.js";

const WORKER_URL = new URL("./user-worker.cjs", import.meta.url);

export type FunctionInvokeFailureCode =
  | "function_timeout"
  | "function_oom"
  | "function_crashed"
  | "function_module_denied"
  | "function_module_missing"
  | "function_bad_export"
  | "function_bad_result"
  | "function_output_too_large"
  | "policy_denied"
  | "forbidden"
  | "pool_saturated"
  | "pool_closed";

export class FunctionInvokeError extends Error {
  readonly code: FunctionInvokeFailureCode;
  readonly status: number;

  constructor(code: FunctionInvokeFailureCode, message: string, status?: number) {
    super(message);
    this.name = "FunctionInvokeError";
    this.code = code;
    this.status = status ?? statusForCode(code);
  }
}

function statusForCode(code: FunctionInvokeFailureCode): number {
  switch (code) {
    case "function_timeout":
      return 504;
    case "function_oom":
      return 503;
    case "pool_saturated":
      return 429;
    case "pool_closed":
      return 503;
    case "function_module_denied":
    case "function_module_missing":
    case "function_bad_export":
    case "function_bad_result":
    case "function_output_too_large":
      return 400;
    case "policy_denied":
    case "forbidden":
      return 403;
    default:
      return 500;
  }
}

export type InvokeUserModuleInput = {
  modulePath: string;
  exportName?: string;
  input?: unknown;
  /** Per-call timeout override (clamped to hard cap). */
  timeoutMs?: number;
  /** Invoking principal — required for jord.* RPCs from the worker. */
  principal?: FunctionPrincipal;
  /** Parent-side deps for principal-bound RPCs (S0091). */
  rpc?: Omit<FunctionRpcDeps, "principal">;
  /** Optional slug for invocation logs. */
  functionSlug?: string;
  /** Log sink for start/end rows (S0091). */
  logs?: LogSink;
  invocationId?: string;
};

export type InvokeUserModuleOk = {
  ok: true;
  result: unknown;
  durationMs: number;
  console?: string[];
  invocationId: string;
};

export type InvokeUserModuleErr = {
  ok: false;
  code: FunctionInvokeFailureCode;
  message: string;
  status: number;
  durationMs: number;
  console?: string[];
  invocationId: string;
};

export type InvokeUserModuleResult = InvokeUserModuleOk | InvokeUserModuleErr;

type Pending = {
  requestId: string;
  invocationId: string;
  resolve: (result: InvokeUserModuleResult) => void;
  timer: ReturnType<typeof setTimeout>;
  startedAt: number;
  principal?: FunctionPrincipal;
  rpc?: Omit<FunctionRpcDeps, "principal">;
  logs?: LogSink;
  functionSlug?: string;
  modulePath: string;
};

type Slot = {
  worker: Worker;
  busy: boolean;
  invocations: number;
  ready: boolean;
  pending: Pending | null;
  /** True while terminate() is in flight; ignore late messages. */
  retiring: boolean;
};

type QueueItem = {
  input: InvokeUserModuleInput;
  timeoutMs: number;
  resolve: (result: InvokeUserModuleResult) => void;
  enqueuedAt: number;
};

function looksLikeOom(err: unknown, exitCode: number | null): boolean {
  if (exitCode === 134 /* SIGABRT */ || exitCode === 3) return true;
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /heap|out of memory|oom|allocation failed|ineffective mark-compacts/i.test(msg);
}

function assertModuleAllowed(modulePath: string, roots: string[]): string {
  const abs = path.resolve(modulePath);
  if (roots.length === 0) {
    throw new FunctionInvokeError(
      "function_module_denied",
      "no moduleRoots configured",
    );
  }
  for (const root of roots) {
    const resolvedRoot = path.resolve(root);
    const prefix = resolvedRoot.endsWith(path.sep)
      ? resolvedRoot
      : resolvedRoot + path.sep;
    if (abs === resolvedRoot || abs.startsWith(prefix)) return abs;
  }
  throw new FunctionInvokeError(
    "function_module_denied",
    "module path outside allowlisted roots",
  );
}

export class FunctionWorkerPool {
  readonly config: FunctionPoolConfig;
  private readonly slots: Slot[] = [];
  private readonly queue: QueueItem[] = [];
  private closed = false;

  constructor(config: Partial<FunctionPoolConfig> = {}) {
    this.config = clampPoolConfig(config);
  }

  /** Absolute path to the fixed bootstrap (tests / diagnostics). */
  static workerEntryPath(): string {
    return fileURLToPath(WORKER_URL);
  }

  get size(): number {
    return this.slots.length;
  }

  get queued(): number {
    return this.queue.length;
  }

  async invoke(input: InvokeUserModuleInput): Promise<InvokeUserModuleResult> {
    const invocationId = input.invocationId ?? randomUUID();
    if (this.closed) {
      return {
        ok: false,
        code: "pool_closed",
        message: "function worker pool is closed",
        status: 503,
        durationMs: 0,
        invocationId,
      };
    }

    let modulePath: string;
    try {
      modulePath = assertModuleAllowed(input.modulePath, this.config.moduleRoots);
    } catch (err) {
      if (err instanceof FunctionInvokeError) {
        return {
          ok: false,
          code: err.code,
          message: err.message,
          status: err.status,
          durationMs: 0,
          invocationId,
        };
      }
      throw err;
    }

    const boundedTimeout = Math.min(
      Math.max(1, input.timeoutMs ?? this.config.timeoutMs),
      60_000,
    );

    return new Promise<InvokeUserModuleResult>((resolve) => {
      const item: QueueItem = {
        input: { ...input, modulePath, invocationId },
        timeoutMs: boundedTimeout,
        resolve,
        enqueuedAt: Date.now(),
      };
      this.enqueueOrReject(item);
      this.pump();
    });
  }

  private enqueueOrReject(item: QueueItem): void {
    const invocationId = item.input.invocationId ?? randomUUID();
    if (this.queue.length >= this.config.maxQueued) {
      item.resolve({
        ok: false,
        code: "pool_saturated",
        message: "function worker pool saturated",
        status: 429,
        durationMs: 0,
        invocationId,
      });
      return;
    }
    this.queue.push(item);
  }

  private spawn(): Slot {
    const env = buildWorkerEnv(this.config.envAllowlist);
    const worker = new Worker(WORKER_URL, {
      workerData: { moduleRoots: this.config.moduleRoots },
      env,
      resourceLimits: {
        maxOldGenerationSizeMb: this.config.maxOldGenerationSizeMb,
      },
    });
    const slot: Slot = {
      worker,
      busy: false,
      invocations: 0,
      ready: false,
      pending: null,
      retiring: false,
    };
    this.attachHandlers(slot);
    return slot;
  }

  private attachHandlers(slot: Slot): void {
    slot.worker.on("message", (msg: unknown) => {
      if (!msg || typeof msg !== "object") return;
      const m = msg as {
        type?: string;
        requestId?: string;
        rpcId?: string;
        op?: string;
        args?: unknown;
        ok?: boolean;
        result?: unknown;
        error?: string;
        code?: string;
        console?: string[];
        status?: number;
      };
      if (m.type === "ready") {
        slot.ready = true;
        this.pump();
        return;
      }
      if (m.type === "jord_rpc" && typeof m.requestId === "string" && typeof m.rpcId === "string") {
        void this.handleRpc(slot, m.requestId, m.rpcId, m.op ?? "", m.args);
        return;
      }
      if (m.type !== "result" || typeof m.requestId !== "string") return;
      if (slot.retiring) return;
      const pending = slot.pending;
      if (!pending || pending.requestId !== m.requestId) return;
      clearTimeout(pending.timer);
      slot.pending = null;
      slot.busy = false;
      slot.invocations += 1;
      const durationMs = Date.now() - pending.startedAt;
      const consoleLines = Array.isArray(m.console) ? m.console.map(String) : [];
      if (m.ok) {
        const result: InvokeUserModuleOk = {
          ok: true,
          result: m.result ?? null,
          durationMs,
          console: consoleLines,
          invocationId: pending.invocationId,
        };
        this.logInvocation(pending, result, consoleLines);
        pending.resolve(result);
      } else {
        const code = normalizeFailureCode(m.code);
        const result: InvokeUserModuleErr = {
          ok: false,
          code,
          message: m.error || code,
          status: typeof m.status === "number" ? m.status : statusForCode(code),
          durationMs,
          console: consoleLines,
          invocationId: pending.invocationId,
        };
        this.logInvocation(pending, result, consoleLines);
        pending.resolve(result);
      }
      if (slot.invocations >= this.config.recycleAfterInvocations) {
        void this.retire(slot);
      } else {
        this.pump();
      }
    });

    slot.worker.on("error", (err) => {
      this.failSlot(slot, err, null);
    });

    slot.worker.on("exit", (code) => {
      if (slot.retiring && !slot.pending) {
        this.removeSlot(slot);
        this.pump();
        return;
      }
      this.failSlot(slot, null, code);
    });
  }

  private async handleRpc(
    slot: Slot,
    requestId: string,
    rpcId: string,
    op: string,
    args: unknown,
  ): Promise<void> {
    const pending = slot.pending;
    const reply = (payload: Record<string, unknown>) => {
      try {
        slot.worker.postMessage({ type: "jord_rpc_result", requestId, rpcId, ...payload });
      } catch {
        /* worker gone */
      }
    };
    if (!pending || pending.requestId !== requestId) {
      reply({ ok: false, error: "no active invoke", code: "function_crashed", status: 500 });
      return;
    }
    if (!pending.principal || !pending.rpc) {
      reply({
        ok: false,
        error: "principal-bound client not configured for this invoke",
        code: "forbidden",
        status: 403,
      });
      return;
    }
    if (!isFunctionRpcOp(op)) {
      reply({ ok: false, error: `unknown op ${op}`, code: "function_crashed", status: 400 });
      return;
    }
    try {
      const result = await executeFunctionRpc(
        { ...pending.rpc, principal: pending.principal },
        op,
        args,
      );
      reply({ ok: true, result });
    } catch (err) {
      if (err instanceof FunctionRpcError) {
        reply({
          ok: false,
          error: err.message,
          code: err.code,
          status: err.status,
        });
        return;
      }
      reply({
        ok: false,
        error: err instanceof Error ? err.message : "rpc failed",
        code: "function_crashed",
        status: 500,
      });
    }
  }

  private logInvocation(
    pending: Pending,
    result: InvokeUserModuleResult,
    consoleLines: string[],
  ): void {
    appendInvocationLog(pending.logs, {
      invocationId: pending.invocationId,
      functionSlug: pending.functionSlug,
      modulePath: pending.modulePath,
      status: result.ok ? "ok" : statusFromFailureCode(result.code),
      durationMs: result.durationMs,
      code: result.ok ? undefined : result.code,
      message: result.ok ? undefined : result.message,
      consoleLines,
      principal: pending.principal
        ? {
            subject: pending.principal.subject,
            uid: pending.principal.uid,
            role: pending.principal.role,
          }
        : { subject: "unknown" },
    });
  }

  private failSlot(slot: Slot, err: unknown, exitCode: number | null): void {
    if (slot.retiring && !slot.pending) {
      this.removeSlot(slot);
      this.pump();
      return;
    }
    const pending = slot.pending;
    slot.pending = null;
    slot.busy = false;
    slot.ready = false;
    const durationMs = pending ? Date.now() - pending.startedAt : 0;
    if (pending) {
      clearTimeout(pending.timer);
      const oom = looksLikeOom(err, exitCode);
      const code: FunctionInvokeFailureCode = oom ? "function_oom" : "function_crashed";
      const result: InvokeUserModuleErr = {
        ok: false,
        code,
        message: oom
          ? "function worker exceeded memory cap"
          : err instanceof Error
            ? err.message
            : exitCode != null
              ? `worker exited with code ${exitCode}`
              : "function worker crashed",
        status: statusForCode(code),
        durationMs,
        invocationId: pending.invocationId,
      };
      this.logInvocation(pending, result, []);
      pending.resolve(result);
    }
    this.removeSlot(slot);
    this.pump();
  }

  private removeSlot(slot: Slot): void {
    const idx = this.slots.indexOf(slot);
    if (idx >= 0) this.slots.splice(idx, 1);
    slot.retiring = true;
    slot.ready = false;
  }

  private async retire(slot: Slot): Promise<void> {
    if (slot.retiring) return;
    slot.retiring = true;
    slot.ready = false;
    try {
      await slot.worker.terminate();
    } catch {
      /* already dead */
    }
    this.removeSlot(slot);
    this.pump();
  }

  private async dispatch(slot: Slot, item: QueueItem): Promise<void> {
    if (slot.busy || slot.retiring || !slot.ready) {
      this.enqueueOrReject(item);
      return;
    }
    slot.busy = true;
    const requestId = randomUUID();
    const invocationId = item.input.invocationId ?? randomUUID();
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      const pending = slot.pending;
      if (!pending || pending.requestId !== requestId) return;
      slot.pending = null;
      slot.busy = false;
      const durationMs = Date.now() - startedAt;
      const result: InvokeUserModuleErr = {
        ok: false,
        code: "function_timeout",
        message: `function exceeded ${item.timeoutMs}ms deadline`,
        status: 504,
        durationMs,
        invocationId: pending.invocationId,
      };
      this.logInvocation(pending, result, []);
      pending.resolve(result);
      // Hard kill — user code cannot catch terminate().
      void this.retire(slot);
    }, item.timeoutMs);

    slot.pending = {
      requestId,
      invocationId,
      resolve: item.resolve,
      principal: item.input.principal,
      rpc: item.input.rpc,
      logs: item.input.logs,
      functionSlug: item.input.functionSlug,
      modulePath: item.input.modulePath,
      timer,
      startedAt,
    };

    try {
      slot.worker.postMessage({
        type: "invoke",
        requestId,
        modulePath: item.input.modulePath,
        exportName: item.input.exportName,
        input: item.input.input ?? null,
        maxOutputBytes: this.config.maxOutputBytes,
      });
    } catch (err) {
      clearTimeout(timer);
      slot.pending = null;
      slot.busy = false;
      item.resolve({
        ok: false,
        code: "function_crashed",
        message: err instanceof Error ? err.message : "failed to post invoke",
        status: 500,
        durationMs: Date.now() - startedAt,
        invocationId,
      });
      void this.retire(slot);
    }
  }

  private pump(): void {
    if (this.closed) return;
    while (this.queue.length > 0) {
      let slot = this.slots.find((s) => s.ready && !s.busy && !s.retiring);
      if (!slot && this.slots.length < this.config.maxWorkers) {
        slot = this.spawn();
        this.slots.push(slot);
        // Will re-enter pump on ready.
        return;
      }
      if (!slot) return;
      const item = this.queue.shift();
      if (!item) return;
      void this.dispatch(slot, item);
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;
      item.resolve({
        ok: false,
        code: "pool_closed",
        message: "function worker pool is closed",
        status: 503,
        durationMs: 0,
        invocationId: item.input.invocationId ?? randomUUID(),
      });
    }
    const closing = [...this.slots];
    for (const slot of closing) {
      if (slot.pending) {
        clearTimeout(slot.pending.timer);
        slot.pending.resolve({
          ok: false,
          code: "pool_closed",
          message: "function worker pool is closed",
          status: 503,
          durationMs: Date.now() - slot.pending.startedAt,
          invocationId: slot.pending.invocationId,
        });
        slot.pending = null;
      }
      slot.retiring = true;
      try {
        await slot.worker.terminate();
      } catch {
        /* ignore */
      }
    }
    this.slots.length = 0;
  }
}

function normalizeFailureCode(raw: string | undefined): FunctionInvokeFailureCode {
  switch (raw) {
    case "function_timeout":
    case "function_oom":
    case "function_crashed":
    case "function_module_denied":
    case "function_module_missing":
    case "function_bad_export":
    case "function_bad_result":
    case "function_output_too_large":
    case "policy_denied":
    case "forbidden":
    case "pool_saturated":
    case "pool_closed":
      return raw;
    default:
      return "function_crashed";
  }
}

/** Process-wide pools keyed by project id (default = single-tenant lab). */
const pools = new Map<string, FunctionWorkerPool>();

export function getFunctionPool(
  projectId: string,
  config?: Partial<FunctionPoolConfig>,
): FunctionWorkerPool {
  const key = projectId || "default";
  let pool = pools.get(key);
  if (!pool) {
    pool = new FunctionWorkerPool(config);
    pools.set(key, pool);
  }
  return pool;
}

export async function closeAllFunctionPools(): Promise<void> {
  const all = [...pools.values()];
  pools.clear();
  await Promise.all(all.map((p) => p.close()));
}
