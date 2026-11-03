import { randomBytes } from "node:crypto";

import type { JordDriverPort } from "@altr/jord";

import type { Principal } from "../auth/principal.js";
import type { JordStoragePort, MultipartPartInfo } from "./port.js";

/**
 * S0081 — multipart / resumable upload sessions.
 *
 * Session rows (`jord_uploads`) hold identity + bounds only. Which parts have
 * arrived is always read from the store (S3 ListParts / local `.multipart`
 * dir), so resume works after a disconnect or a server restart.
 */

export const MIN_PART_BYTES_DEFAULT = 5 * 1024 * 1024;
export const MAX_PART_BYTES = 256 * 1024 * 1024;
export const DEFAULT_PART_BYTES = 16 * 1024 * 1024;
export const MAX_PARTS = 10_000;
export const MAX_SIGN_BATCH = 100;
export const MAX_OPEN_UPLOADS_PER_PRINCIPAL = 50;
export const UPLOAD_TTL_MS_DEFAULT = 24 * 60 * 60 * 1000;

export type UploadStatus = "open" | "completing" | "aborting" | "done";

/** A completing/aborting session older than this is considered stuck. */
export const STUCK_SESSION_MS = 60 * 60 * 1000;

export type UploadRow = {
  id: string;
  bucket: string;
  objectKey: string;
  principal: string;
  contentType: string;
  totalSize: number;
  partSize: number;
  partsExpected: number;
  providerUploadId: string;
  storageKind: string;
  status: UploadStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

export type MultipartLimits = {
  minPartBytes: number;
  uploadTtlMs: number;
};

export function resolveMultipartLimits(
  env: NodeJS.ProcessEnv = process.env,
): MultipartLimits {
  const min = Number.parseInt(env.JORD_MULTIPART_MIN_PART_BYTES ?? "", 10);
  const ttl = Number.parseInt(env.JORD_MULTIPART_TTL_MS ?? "", 10);
  return {
    minPartBytes: Number.isFinite(min) && min > 0 ? min : MIN_PART_BYTES_DEFAULT,
    uploadTtlMs: Number.isFinite(ttl) && ttl > 0 ? ttl : UPLOAD_TTL_MS_DEFAULT,
  };
}

/** Stable subject string a session is bound to. */
export function principalSubject(principal: Principal): string | null {
  if (principal.uid) return `${principal.kind}:${principal.uid}`;
  // Shared-secret service/operator principals have no uid; the role is their identity.
  if (principal.kind === "service" || principal.kind === "operator") {
    return `${principal.kind}:${principal.role}`;
  }
  return null;
}

/** 256-bit random token, hex. Unguessable; safe as a path segment. */
export function newUploadId(): string {
  return randomBytes(32).toString("hex");
}

export function isUploadId(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export type PartPlan =
  | { ok: true; partSize: number; partsExpected: number }
  | { ok: false; status: 400; message: string };

/** Validate total size + part size and derive the part count. */
export function planParts(input: {
  totalSize: unknown;
  partSize: unknown;
  minPartBytes: number;
}): PartPlan {
  const total = input.totalSize;
  if (
    typeof total !== "number" ||
    !Number.isSafeInteger(total) ||
    total <= 0
  ) {
    return { ok: false, status: 400, message: "size must be a positive integer" };
  }
  let partSize: number;
  if (input.partSize === undefined || input.partSize === null) {
    partSize = Math.max(DEFAULT_PART_BYTES, Math.ceil(total / MAX_PARTS));
  } else if (
    typeof input.partSize === "number" &&
    Number.isSafeInteger(input.partSize)
  ) {
    partSize = input.partSize;
  } else {
    return { ok: false, status: 400, message: "part_size must be an integer" };
  }
  if (partSize < input.minPartBytes) {
    return {
      ok: false,
      status: 400,
      message: `part_size must be at least ${input.minPartBytes} bytes`,
    };
  }
  if (partSize > MAX_PART_BYTES) {
    return {
      ok: false,
      status: 400,
      message: `part_size must be at most ${MAX_PART_BYTES} bytes`,
    };
  }
  const partsExpected = Math.ceil(total / partSize);
  if (partsExpected > MAX_PARTS) {
    return {
      ok: false,
      status: 400,
      message: `upload needs ${partsExpected} parts; the maximum is ${MAX_PARTS}`,
    };
  }
  return { ok: true, partSize, partsExpected };
}

export function expectedPartSize(row: UploadRow, partNumber: number): number {
  return partNumber < row.partsExpected
    ? row.partSize
    : row.totalSize - row.partSize * (row.partsExpected - 1);
}

export function validPartNumber(row: UploadRow, value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= row.partsExpected
  );
}

// ---------------------------------------------------------------- SQL

function q(
  jord: JordDriverPort,
  sql: string,
  args: Array<string | number | null> = [],
): Promise<Array<Record<string, unknown>>> {
  if (jord.dialect === "postgres") {
    let i = 0;
    return jord.query(
      sql.replace(/\?/g, () => `$${++i}`),
      args,
    );
  }
  return jord.query(sql, args);
}

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function fromRow(r: Record<string, unknown>): UploadRow {
  return {
    id: String(r.id),
    bucket: String(r.bucket),
    objectKey: String(r.object_key),
    principal: String(r.principal),
    contentType: String(r.content_type),
    totalSize: num(r.total_size),
    partSize: num(r.part_size),
    partsExpected: num(r.parts_expected),
    providerUploadId: String(r.provider_upload_id),
    storageKind: String(r.storage_kind),
    status: String(r.status) as UploadStatus,
    createdAt: num(r.created_at),
    updatedAt: num(r.updated_at),
    expiresAt: num(r.expires_at),
  };
}

export async function insertUpload(
  jord: JordDriverPort,
  row: UploadRow,
): Promise<void> {
  await q(
    jord,
    "INSERT INTO jord_uploads (id, bucket, object_key, principal, content_type, total_size, part_size, parts_expected, provider_upload_id, storage_kind, status, created_at, updated_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      row.id,
      row.bucket,
      row.objectKey,
      row.principal,
      row.contentType,
      row.totalSize,
      row.partSize,
      row.partsExpected,
      row.providerUploadId,
      row.storageKind,
      row.status,
      row.createdAt,
      row.updatedAt,
      row.expiresAt,
    ],
  );
}

export async function getUpload(
  jord: JordDriverPort,
  id: string,
): Promise<UploadRow | null> {
  const rows = await q(jord, "SELECT * FROM jord_uploads WHERE id = ?", [id]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function countOpenUploads(
  jord: JordDriverPort,
  principal: string,
  nowMs: number,
): Promise<number> {
  const rows = await q(
    jord,
    "SELECT COUNT(*) AS n FROM jord_uploads WHERE principal = ? AND status <> 'done' AND expires_at > ?",
    [principal, nowMs],
  );
  return num(rows[0]?.n);
}

export async function touchUpload(
  jord: JordDriverPort,
  id: string,
  expiresAt: number,
  nowMs: number,
): Promise<void> {
  await q(
    jord,
    "UPDATE jord_uploads SET expires_at = ?, updated_at = ? WHERE id = ? AND status = 'open'",
    [expiresAt, nowMs, id],
  );
}

/** Atomic status flip; resolves true only if this caller won the transition. */
export async function transitionUpload(
  jord: JordDriverPort,
  id: string,
  from: UploadStatus,
  to: UploadStatus,
  nowMs: number,
): Promise<boolean> {
  const rows = await q(
    jord,
    "UPDATE jord_uploads SET status = ?, updated_at = ? WHERE id = ? AND status = ? RETURNING id",
    [to, nowMs, id, from],
  );
  return rows.length > 0;
}

export async function deleteUpload(
  jord: JordDriverPort,
  id: string,
): Promise<void> {
  await q(jord, "DELETE FROM jord_uploads WHERE id = ?", [id]);
}

export async function listExpiredUploads(
  jord: JordDriverPort,
  nowMs: number,
): Promise<UploadRow[]> {
  const rows = await q(
    jord,
    "SELECT * FROM jord_uploads WHERE expires_at <= ? AND (status IN ('open','done') OR updated_at < ?) ORDER BY expires_at ASC LIMIT 500",
    [nowMs, nowMs - STUCK_SESSION_MS],
  );
  return rows.map(fromRow);
}

/**
 * Conditionally claim an expired, sweepable session for abort. Re-checks
 * expiry and status in the UPDATE so a session refreshed (or moved on) since
 * the list is left alone.
 */
export async function claimExpiredUpload(
  jord: JordDriverPort,
  id: string,
  nowMs: number,
): Promise<boolean> {
  const rows = await q(
    jord,
    "UPDATE jord_uploads SET status = 'aborting', updated_at = ? WHERE id = ? AND expires_at <= ? AND (status = 'open' OR (status IN ('completing','aborting') AND updated_at < ?)) RETURNING id",
    [nowMs, id, nowMs, nowMs - STUCK_SESSION_MS],
  );
  return rows.length > 0;
}

export async function deleteUploadIf(
  jord: JordDriverPort,
  id: string,
  status: UploadStatus,
): Promise<boolean> {
  const rows = await q(
    jord,
    "DELETE FROM jord_uploads WHERE id = ? AND status = ? RETURNING id",
    [id, status],
  );
  return rows.length > 0;
}

// ---------------------------------------------------------------- verify

export type PartCheck =
  | { ok: true; parts: MultipartPartInfo[] }
  | { ok: false; message: string; missing?: number[] };

/**
 * Compare what the store holds with what the session expects: exactly parts
 * 1..N, each at its planned size, and (when the client sent ETags) matching.
 */
export function verifyParts(
  row: UploadRow,
  stored: MultipartPartInfo[],
  claimed?: Array<{ partNumber: number; etag: string }>,
): PartCheck {
  const byNumber = new Map(stored.map((p) => [p.partNumber, p]));
  const missing: number[] = [];
  const parts: MultipartPartInfo[] = [];
  for (let n = 1; n <= row.partsExpected; n += 1) {
    const have = byNumber.get(n);
    if (!have) {
      missing.push(n);
      continue;
    }
    if (have.size !== expectedPartSize(row, n)) {
      return {
        ok: false,
        message: `part ${n} has ${have.size} bytes; expected ${expectedPartSize(row, n)}`,
      };
    }
    parts.push(have);
  }
  if (missing.length > 0) {
    return {
      ok: false,
      message: `missing parts: ${missing.slice(0, 20).join(", ")}`,
      missing,
    };
  }
  if (stored.some((p) => p.partNumber > row.partsExpected || p.partNumber < 1)) {
    return { ok: false, message: "unexpected part numbers present" };
  }
  if (claimed) {
    if (claimed.length !== row.partsExpected) {
      return {
        ok: false,
        message: `expected ${row.partsExpected} parts in request`,
      };
    }
    for (const c of claimed) {
      const have = byNumber.get(c.partNumber);
      if (!have || have.etag.replace(/"/g, "") !== c.etag.replace(/"/g, "")) {
        return {
          ok: false,
          message: `etag mismatch for part ${c.partNumber}`,
        };
      }
    }
  }
  return { ok: true, parts };
}

// ---------------------------------------------------------------- GC

export type UploadGcResult = {
  expiredUploads: number;
  errors: string[];
};

/**
 * Abort + delete sessions past `expires_at`. Each row is claimed with a
 * conditional UPDATE (expired AND sweepable) so a refreshed session is never
 * aborted. A row is reopened (retried next sweep) when the store abort fails.
 * Errors are short codes only; details go to the server log.
 */
export async function gcExpiredUploads(input: {
  jord: JordDriverPort;
  resolveStorage: (bucket: string) => Promise<JordStoragePort>;
  nowMs?: number;
}): Promise<UploadGcResult> {
  const now = input.nowMs ?? Date.now();
  const expired = await listExpiredUploads(input.jord, now);
  let expiredUploads = 0;
  const errors: string[] = [];
  for (const row of expired) {
    try {
      if (row.status === "done") {
        if (await deleteUploadIf(input.jord, row.id, "done")) expiredUploads += 1;
        continue;
      }
      if (!(await claimExpiredUpload(input.jord, row.id, now))) continue;
      try {
        const storage = await input.resolveStorage(row.bucket);
        await storage.abortMultipartUpload?.({
          bucket: row.bucket,
          key: row.objectKey,
          uploadId: row.providerUploadId,
        });
      } catch (err) {
        console.error(
          `[@altr/jord-server] upload gc abort failed ${row.id.slice(0, 8)} ${row.bucket}/${row.objectKey}`,
          err,
        );
        await transitionUpload(input.jord, row.id, "aborting", "open", Date.now());
        errors.push(`${row.id.slice(0, 8)}:storage_error`);
        continue;
      }
      await deleteUploadIf(input.jord, row.id, "aborting");
      expiredUploads += 1;
    } catch (err) {
      console.error(
        `[@altr/jord-server] upload gc failed ${row.id.slice(0, 8)}`,
        err,
      );
      errors.push(`${row.id.slice(0, 8)}:gc_error`);
    }
  }
  return { expiredUploads, errors };
}
