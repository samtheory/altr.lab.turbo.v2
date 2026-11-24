/**
 * S0091 — parent-side RPC for in-worker Jord client.
 * Never bypasses policies; no admin / raw-SQL surface.
 */
import type { JordDriverPort, JordRecord } from "@altr/jord";

import { canWriteBlobs, canWriteRecords, type JordRole } from "../auth/roles.js";
import {
  evaluatePolicies,
  policiesDisabledFromEnv,
} from "../policies/evaluate.js";
import type { WriteWithChange } from "../realtime/types.js";

export type FunctionPrincipal = {
  subject: "service" | "user" | "anon" | "operator";
  uid?: string | null;
  role: JordRole;
  claims?: Record<string, unknown>;
};

export type FunctionRpcOp =
  | "table.select"
  | "table.insert"
  | "table.update"
  | "table.delete"
  | "blob.sign";

export class FunctionRpcError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FunctionRpcError";
    this.status = status;
    this.code = code;
  }
}

export type FunctionRpcDeps = {
  jord: JordDriverPort;
  principal: FunctionPrincipal;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  writeChange?: WriteWithChange;
  /** Optional blob signer — omitted → blob.sign returns 501. */
  signBlob?: (input: {
    key: string;
    method: "GET" | "PUT";
    ttlSec?: number;
  }) => Promise<{ url: string; expiresAt: number }>;
};

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

/**
 * Execute one allowlisted RPC on behalf of the invoking principal.
 * `bypass` is always false — service callers still go through policies
 * unless subject is literally `"service"` (evaluatePolicies short-circuit).
 * There is no admin / SQL / migrate op on this surface.
 */
export async function executeFunctionRpc(
  deps: FunctionRpcDeps,
  op: FunctionRpcOp,
  rawArgs: unknown,
): Promise<unknown> {
  const args = asRecord(rawArgs);
  const { jord, principal } = deps;

  switch (op) {
    case "table.select": {
      const table = String(args.table ?? "");
      if (table !== "records") {
        throw new FunctionRpcError(
          400,
          "unsupported_table",
          "in-worker client only supports records (v1)",
        );
      }
      const bucket =
        typeof args.bucket === "string" && args.bucket.length > 0
          ? args.bucket
          : "lab";
      const decision = await evaluatePolicies({
        jord,
        tableName: "records",
        operation: "select",
        role: principal.role,
        subject: principal.subject,
        uid: principal.uid,
        claims: principal.claims,
        bucket,
        bypass: false,
        disabled: policiesDisabledFromEnv(),
      });
      if (!decision.allowed) {
        throw new FunctionRpcError(403, "policy_denied", "policy denied select");
      }
      jord.bindRlsSession?.({
        role:
          principal.subject === "user" || principal.subject === "anon"
            ? principal.subject
            : principal.role,
        bucket,
        uid: principal.uid ?? "",
      });
      const rows = await jord.listRecordsByBucket(bucket);
      const limit =
        typeof args.limit === "number" && Number.isFinite(args.limit)
          ? Math.max(1, Math.min(Math.floor(args.limit), 500))
          : 100;
      return {
        bucket,
        records: rows.slice(0, limit).map(publicRecord),
        count: Math.min(rows.length, limit),
      };
    }

    case "table.insert": {
      if (!canWriteRecords(principal.role)) {
        throw new FunctionRpcError(403, "forbidden", "role cannot write records");
      }
      const table = String(args.table ?? "");
      if (table !== "records") {
        throw new FunctionRpcError(
          400,
          "unsupported_table",
          "in-worker client only supports records (v1)",
        );
      }
      const row = asRecord(args.row);
      const bucket =
        typeof row.bucket === "string" && row.bucket.length > 0
          ? row.bucket
          : typeof args.bucket === "string"
            ? args.bucket
            : "lab";
      const decision = await evaluatePolicies({
        jord,
        tableName: "records",
        operation: "insert",
        role: principal.role,
        subject: principal.subject,
        uid: principal.uid,
        claims: principal.claims,
        bucket,
        bypass: false,
        disabled: policiesDisabledFromEnv(),
      });
      if (!decision.allowed) {
        throw new FunctionRpcError(403, "policy_denied", "policy denied insert");
      }
      const recordBody =
        typeof row.body === "string"
          ? row.body
          : row.body === undefined || row.body === null
            ? ""
            : JSON.stringify(row.body);
      const metadata =
        typeof row.metadata === "string" || row.metadata === null
          ? (row.metadata as string | null)
          : undefined;
      const insert = () => {
        jord.bindRlsSession?.({
          role:
            principal.subject === "user" || principal.subject === "anon"
              ? principal.subject
              : principal.role,
          bucket,
          uid: principal.uid ?? "",
        });
        return jord.insertRecord({ bucket, body: recordBody, metadata });
      };
      const created = deps.writeChange
        ? await deps.writeChange(insert, (inserted) => ({
            op: "insert",
            id: inserted.id,
            version: inserted.version,
          }))
        : await deps.enqueueWrite(insert);
      return publicRecord(created);
    }

    case "table.update":
    case "table.delete":
      throw new FunctionRpcError(
        501,
        "not_implemented",
        `${op} is not available in the in-worker client yet`,
      );

    case "blob.sign": {
      if (!canWriteBlobs(principal.role) && String(args.method ?? "GET") === "PUT") {
        throw new FunctionRpcError(403, "forbidden", "role cannot sign uploads");
      }
      if (!deps.signBlob) {
        throw new FunctionRpcError(501, "not_implemented", "blob.sign not wired");
      }
      const key = String(args.key ?? "");
      if (!key) {
        throw new FunctionRpcError(400, "missing_key", "blob.sign requires key");
      }
      const method = args.method === "PUT" ? "PUT" : "GET";
      return deps.signBlob({
        key,
        method,
        ttlSec: typeof args.ttlSec === "number" ? args.ttlSec : undefined,
      });
    }

    default: {
      const _exhaustive: never = op;
      throw new FunctionRpcError(400, "unknown_op", `unknown op ${String(_exhaustive)}`);
    }
  }
}

export function isFunctionRpcOp(value: string): value is FunctionRpcOp {
  return (
    value === "table.select" ||
    value === "table.insert" ||
    value === "table.update" ||
    value === "table.delete" ||
    value === "blob.sign"
  );
}
