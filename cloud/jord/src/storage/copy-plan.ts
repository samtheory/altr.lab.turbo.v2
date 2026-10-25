import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { JordBlob, JordDriverPort } from "@altr/jord";

import { listLocalObjectPaths } from "./local.js";

export type CopyPlanObject = {
  bucket: string;
  key: string;
  localPath: string;
  localSha256: string;
  localSize: number;
  metaStatus: string | null;
  metaEtag: string | null;
  action: "copy" | "skip_ready_match" | "verify_mismatch";
};

export type CopyPlanResult = {
  dryRun: true;
  sourceRoot: string;
  objectCount: number;
  wouldCopy: number;
  wouldSkip: number;
  mismatches: number;
  /** Explicit: this plan never deletes local bytes. */
  deleteLocal: false;
  /** Flip requires a separate operator flag / env change after verify. */
  switchRequiresExplicitFlag: true;
  objects: CopyPlanObject[];
  steps: string[];
};

/**
 * Dry-run copy/verify plan from local disk → remote bucket metadata.
 * Never deletes source bytes. Switch is a separate operator step.
 */
export async function buildLocalToRemoteCopyPlan(input: {
  jord: JordDriverPort;
  localRoot: string;
}): Promise<CopyPlanResult> {
  const onDisk = await listLocalObjectPaths(input.localRoot);
  const metaRows = await input.jord.listAllBlobMeta();
  const byKey = new Map<string, JordBlob>();
  for (const row of metaRows) {
    byKey.set(`${row.bucket}/${row.key}`, row);
  }

  const objects: CopyPlanObject[] = [];
  let wouldCopy = 0;
  let wouldSkip = 0;
  let mismatches = 0;

  for (const file of onDisk) {
    const bytes = await readFile(file.absPath);
    const localSha256 = createHash("sha256").update(bytes).digest("hex");
    const meta = byKey.get(`${file.bucket}/${file.key}`) ?? null;
    let action: CopyPlanObject["action"] = "copy";
    if (
      meta &&
      meta.status === "ready" &&
      meta.etag === localSha256 &&
      meta.size === bytes.byteLength
    ) {
      action = "skip_ready_match";
      wouldSkip += 1;
    } else if (meta && meta.etag && meta.etag !== localSha256) {
      action = "verify_mismatch";
      mismatches += 1;
      wouldCopy += 1;
    } else {
      wouldCopy += 1;
    }
    objects.push({
      bucket: file.bucket,
      key: file.key,
      localPath: file.absPath,
      localSha256,
      localSize: bytes.byteLength,
      metaStatus: meta?.status ?? null,
      metaEtag: meta?.etag ?? null,
      action,
    });
  }

  return {
    dryRun: true,
    sourceRoot: input.localRoot,
    objectCount: objects.length,
    wouldCopy,
    wouldSkip,
    mismatches,
    deleteLocal: false,
    switchRequiresExplicitFlag: true,
    objects,
    steps: [
      "1. Keep JORD_STORAGE_BACKEND=local (default).",
      "2. Configure S3/R2/MinIO env (JORD_S3_*).",
      "3. Run this dry-run; fix any verify_mismatch rows.",
      "4. Run a copy command that PUTs each would-copy object to the remote adapter and verifies checksums.",
      "5. Re-run dry-run until wouldCopy is 0 and mismatches is 0.",
      "6. Flip JORD_STORAGE_BACKEND=s3 only after verify. Restart the server.",
      "7. Do NOT delete local bytes in the same step as the flip. Retain local until a later explicit cleanup.",
    ],
  };
}

/** Public summary for HTTP — omits absolute paths that could leak host layout. */
export function publicCopyPlanSummary(plan: CopyPlanResult) {
  return {
    dry_run: plan.dryRun,
    object_count: plan.objectCount,
    would_copy: plan.wouldCopy,
    would_skip: plan.wouldSkip,
    mismatches: plan.mismatches,
    delete_local: plan.deleteLocal,
    switch_requires_explicit_flag: plan.switchRequiresExplicitFlag,
    steps: plan.steps,
    objects: plan.objects.map((o) => ({
      bucket: o.bucket,
      key: o.key,
      local_sha256: o.localSha256,
      local_size: o.localSize,
      meta_status: o.metaStatus,
      meta_etag: o.metaEtag,
      action: o.action,
    })),
  };
}
