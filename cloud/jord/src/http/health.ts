import type { JordDriverPort } from "@altr/jord";
import type { Context } from "hono";

import type { WriteQueue } from "../queue.js";

/** Baseline migration id recorded in `jord_migrations` (NNNN from NNNN_name.sql). */
const BASELINE_MIGRATION_ID = "0001";

export type HealthLiveBody = {
  ok: true;
};

export type HealthCompatBody = HealthLiveBody & {
  dialect: JordDriverPort["dialect"];
  urlScheme: JordDriverPort["urlScheme"];
  vectorBackend: JordDriverPort["vectorBackend"];
};

export type HealthReadyReasons = {
  db?: string;
  migrations?: string;
  queue?: string;
};

export type HealthReadyOk = { ok: true };
export type HealthReadyFail = { ok: false; reasons: HealthReadyReasons };

export type HealthReadyDeps = {
  jord: JordDriverPort;
  enqueueWrite: WriteQueue;
};

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return "unknown error";
}

function queueReason(enqueueWrite: WriteQueue): string | undefined {
  if (typeof enqueueWrite !== "function") {
    return "write queue missing";
  }
  if (typeof enqueueWrite.pending !== "function") {
    return "write queue pending() missing";
  }
  if (typeof enqueueWrite.inFlight !== "function") {
    return "write queue inFlight() missing";
  }
  let pending: number;
  let inFlight: number;
  try {
    pending = enqueueWrite.pending();
    inFlight = enqueueWrite.inFlight();
  } catch (err) {
    return `write queue depth probe failed: ${errorMessage(err)}`;
  }
  if (!Number.isFinite(pending) || pending < 0) {
    return "write queue pending() is not a finite non-negative number";
  }
  if (!Number.isFinite(inFlight) || inFlight < 0) {
    return "write queue inFlight() is not a finite non-negative number";
  }
  if (inFlight > pending) {
    return "write queue inFlight() exceeds pending()";
  }
  return undefined;
}

async function dbReason(jord: JordDriverPort): Promise<string | undefined> {
  try {
    await jord.query("SELECT 1 AS ok");
    return undefined;
  } catch (err) {
    return errorMessage(err);
  }
}

async function migrationsReason(
  jord: JordDriverPort,
): Promise<string | undefined> {
  try {
    // Literal id only — BASELINE_MIGRATION_ID is a fixed catalog constant.
    const rows = await jord.query(
      `SELECT id FROM jord_migrations WHERE id = '${BASELINE_MIGRATION_ID}'`,
    );
    if (rows.length === 0) {
      return `baseline migration ${BASELINE_MIGRATION_ID} not applied`;
    }
    return undefined;
  } catch (err) {
    return errorMessage(err);
  }
}

/**
 * Process liveness — no DB. Used by k8s/load-balancer liveness probes.
 */
export function healthLiveBody(): HealthLiveBody {
  return { ok: true };
}

/**
 * Back-compat `GET /health`: live signal plus dialect labels (never URLs/tokens).
 */
export function healthCompatBody(jord: JordDriverPort): HealthCompatBody {
  return {
    ok: true,
    dialect: jord.dialect,
    urlScheme: jord.urlScheme,
    vectorBackend: jord.vectorBackend,
  };
}

/**
 * Readiness: DB ping + baseline migration row + write queue present.
 */
export async function checkReady(
  deps: HealthReadyDeps,
): Promise<HealthReadyOk | HealthReadyFail> {
  const reasons: HealthReadyReasons = {};

  const db = await dbReason(deps.jord);
  if (db) reasons.db = db;

  // Migrations need the same connection; still probe so operators see both keys.
  const migrations = await migrationsReason(deps.jord);
  if (migrations) reasons.migrations = migrations;

  const queue = queueReason(deps.enqueueWrite);
  if (queue) reasons.queue = queue;

  if (reasons.db || reasons.migrations || reasons.queue) {
    return { ok: false, reasons };
  }
  return { ok: true };
}

export function registerHealthRoutes(
  app: {
    get: (
      path: string,
      handler: (c: Context) => Response | Promise<Response>,
    ) => unknown;
  },
  deps: HealthReadyDeps,
): void {
  app.get("/health/live", (c) => c.json(healthLiveBody()));

  app.get("/health/ready", async (c) => {
    const result = await checkReady(deps);
    if (!result.ok) {
      return c.json(result, 503);
    }
    return c.json(result);
  });

  // Alias of live + dialect metadata for existing callers.
  app.get("/health", (c) => c.json(healthCompatBody(deps.jord)));
}
