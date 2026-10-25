/**
 * Dry-run local → remote copy/verify plan (S0025).
 * Never deletes local bytes. Switch is a separate env flip after verify.
 *
 * Usage:
 *   pnpm --filter @altr/jord-server storage:copy-plan
 */
import { createJordClient } from "@altr/jord";

import { resolveBlobsRoot } from "../src/blobs/disk.js";
import { loadLocalEnv } from "../src/load-env.js";
import {
  buildLocalToRemoteCopyPlan,
  publicCopyPlanSummary,
} from "../src/storage/copy-plan.js";

async function main(): Promise<void> {
  loadLocalEnv();
  const url = process.env.DATABASE_URL?.trim() || "file:./data/jord.db";
  const jord = await createJordClient({ url });
  try {
    const localRoot = resolveBlobsRoot(process.env);
    const plan = await buildLocalToRemoteCopyPlan({ jord, localRoot });
    const summary = publicCopyPlanSummary(plan);
    console.log(JSON.stringify(summary, null, 2));
    if (plan.mismatches > 0) {
      process.exitCode = 2;
    }
  } finally {
    await jord.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
