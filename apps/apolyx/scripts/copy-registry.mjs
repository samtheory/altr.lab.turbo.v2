import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const src = path.join(root, "elements/ui-kit/dist/r");
const dest = path.join(root, "apps/apolyx/public/r");

if (!existsSync(src)) {
  console.warn("Registry copy skipped — run `pnpm --filter @altr/apolyx build` first");
} else {
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
  console.log("Copied registry JSON to public/r");
}
