import type { JordDriverPort, JordRecord } from "@altr/jord";

import { canWriteRecords, type JordRole } from "../auth/roles.js";
import type { LogRing } from "../jobs/log-ring.js";
import {
  evaluatePolicies,
  policiesDisabledFromEnv,
} from "../policies/evaluate.js";

export const BUILTIN_STEP_KINDS = [
  "echo",
  "records_list",
  "records_get",
  "records_insert",
  "records_count",
] as const;

export type BuiltinStepKind = (typeof BUILTIN_STEP_KINDS)[number];

export function isBuiltinStepKind(value: string): value is BuiltinStepKind {
  return (BUILTIN_STEP_KINDS as readonly string[]).includes(value);
}

export type FunctionStep = {
  kind: string;
  config?: Record<string, unknown>;
};

export type FunctionRequestContext = {
  method: string;
  path: string;
  slug?: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
};

export type StepContext = {
  jord: JordDriverPort;
  role: JordRole;
  request: FunctionRequestContext;
  prior: unknown;
  config: Record<string, unknown>;
  /** When set, writes go through the server write queue. */
  enqueueWrite: <T>(fn: () => Promise<T>) => Promise<T>;
  /** When set, AFTER insert triggers can log / invoke. */
  logs?: LogRing;
};

export type StepResult = {
  result: unknown;
};

export type StepHandler = (ctx: StepContext) => Promise<StepResult>;

export type StepError = {
  status: number;
  error: string;
  message: string;
};

export class FunctionStepError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FunctionStepError";
    this.status = status;
    this.code = code;
  }
}

function publicRecord(row: JordRecord) {
  return {
    id: row.id,
    bucket: row.bucket,
    body: row.body,
    metadata: row.metadata,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    version: row.version,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function bodyRecord(body: unknown): Record<string, unknown> {
  return asRecord(body);
}

export const STEP_HANDLERS: Record<BuiltinStepKind, StepHandler> = {
  async echo({ config, request }) {
    const body = bodyRecord(request.body);
    const message =
      typeof config.message === "string"
        ? config.message
        : typeof body.message === "string"
          ? body.message
          : "echo";
    return { result: { echoed: message, body } };
  },

  async records_list({ jord, role, config }) {
    const bucket =
      typeof config.bucket === "string" && config.bucket.length > 0
        ? config.bucket
        : "lab";
    const decision = await evaluatePolicies({
      jord,
      tableName: "records",
      operation: "select",
      role,
      bucket,
      disabled: policiesDisabledFromEnv(),
    });
    if (!decision.allowed) {
      throw new FunctionStepError(
        403,
        "policy_denied",
        `policy ${decision.policy.id} denied select`,
      );
    }
    const limitRaw = config.limit;
    const limit =
      typeof limitRaw === "number" && Number.isFinite(limitRaw)
        ? Math.max(1, Math.min(Math.floor(limitRaw), 500))
        : 100;
    const rows = await jord.listRecordsByBucket(bucket);
    return {
      result: {
        bucket,
        records: rows.slice(0, limit).map(publicRecord),
        count: Math.min(rows.length, limit),
        total: rows.length,
      },
    };
  },

  async records_get({ jord, role, config, request }) {
    const body = bodyRecord(request.body);
    const id =
      (typeof config.id === "string" && config.id) ||
      request.params.id ||
      (typeof body.id === "string" ? body.id : "") ||
      request.query.id ||
      "";
    if (!id) {
      throw new FunctionStepError(
        400,
        "missing_id",
        "records_get requires id in config, params, query, or body",
      );
    }
    const row = await jord.getRecord(id);
    if (!row) {
      throw new FunctionStepError(404, "not_found", `record ${id} not found`);
    }
    const decision = await evaluatePolicies({
      jord,
      tableName: "records",
      operation: "select",
      role,
      bucket: row.bucket,
      disabled: policiesDisabledFromEnv(),
    });
    if (!decision.allowed) {
      throw new FunctionStepError(
        403,
        "policy_denied",
        `policy ${decision.policy.id} denied select`,
      );
    }
    return { result: publicRecord(row) };
  },

  async records_insert({
    jord,
    role,
    config,
    request,
    enqueueWrite,
    logs,
  }) {
    if (!canWriteRecords(role)) {
      throw new FunctionStepError(
        403,
        "forbidden",
        "role cannot write records",
      );
    }
    const body = bodyRecord(request.body);
    const bucket =
      (typeof config.bucket === "string" && config.bucket) ||
      (typeof body.bucket === "string" ? body.bucket : "") ||
      "lab";
    const decision = await evaluatePolicies({
      jord,
      tableName: "records",
      operation: "insert",
      role,
      bucket,
      disabled: policiesDisabledFromEnv(),
    });
    if (!decision.allowed) {
      throw new FunctionStepError(
        403,
        "policy_denied",
        `policy ${decision.policy.id} denied insert`,
      );
    }
    const recordBody =
      typeof body.body === "string"
        ? body.body
        : typeof config.body === "string"
          ? config.body
          : JSON.stringify(body);
    const metadata =
      typeof body.metadata === "string" || body.metadata === null
        ? (body.metadata as string | null)
        : undefined;

    const row = await enqueueWrite(() =>
      jord.insertRecord({ bucket, body: recordBody, metadata }),
    );
    if (logs) {
      // Dynamic import avoids kinds ↔ triggers ↔ runner cycle.
      const { runTriggersAfterWrite, triggersDisabledFromEnv } = await import(
        "../triggers/runner.js"
      );
      await runTriggersAfterWrite({
        jord,
        logs,
        tableName: "records",
        event: "insert",
        row,
        role,
        enqueueWrite,
        disabled: triggersDisabledFromEnv(),
      });
    }
    return { result: publicRecord(row) };
  },

  async records_count({ jord, role, config }) {
    const bucket =
      typeof config.bucket === "string" && config.bucket.length > 0
        ? config.bucket
        : "lab";
    const decision = await evaluatePolicies({
      jord,
      tableName: "records",
      operation: "select",
      role,
      bucket,
      disabled: policiesDisabledFromEnv(),
    });
    if (!decision.allowed) {
      throw new FunctionStepError(
        403,
        "policy_denied",
        `policy ${decision.policy.id} denied select`,
      );
    }
    const rows = await jord.listRecordsByBucket(bucket);
    return { result: { bucket, count: rows.length } };
  },
};

export function getStepHandler(kind: string): StepHandler | null {
  if (!isBuiltinStepKind(kind)) return null;
  return STEP_HANDLERS[kind];
}

export function parseStepsJson(raw: string): FunctionStep[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const rec = item as Record<string, unknown>;
      if (typeof rec.kind !== "string") return [];
      const config =
        rec.config && typeof rec.config === "object" && !Array.isArray(rec.config)
          ? (rec.config as Record<string, unknown>)
          : {};
      return [{ kind: rec.kind, config }];
    });
  } catch {
    return [];
  }
}
