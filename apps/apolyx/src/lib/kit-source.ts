import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type RegistryManifest = {
  name: string;
  files: Array<{ path: string; target?: string }>;
};

let registryNamesCache: Set<string> | null = null;

function uiKitRoot() {
  // Next cwd is apps/apolyx; kit lives at monorepo elements/ui-kit.
  return path.resolve(process.cwd(), "../../elements/ui-kit");
}

async function registryNames(): Promise<Set<string>> {
  if (registryNamesCache) return registryNamesCache;
  const dir = path.join(uiKitRoot(), "registry");
  const entries = await readdir(dir);
  registryNamesCache = new Set(
    entries.filter((f) => f.endsWith(".json") && f !== "schema.json").map((f) => f.slice(0, -5)),
  );
  return registryNamesCache;
}

/**
 * Map a demo id (`button-demo`, `button-status-demo`, `input-basics-demo`)
 * to a registry item name (`button`, `input`) by longest hyphen prefix match.
 */
export async function registryNameFromDemo(demoName: string): Promise<string | null> {
  const names = await registryNames();
  const base = demoName.replace(/-demo$/, "");
  if (names.has(base)) return base;

  const parts = base.split("-");
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join("-");
    if (names.has(candidate)) return candidate;
  }
  return null;
}

function pickPrimaryFile(manifest: RegistryManifest): string | null {
  const files = manifest.files ?? [];
  if (!files.length) return null;
  const byName =
    files.find((f) => f.target === `${manifest.name}.tsx`) ??
    files.find((f) => f.path.endsWith(`/${manifest.name}.tsx`)) ??
    files.find((f) => f.path.endsWith(".tsx")) ??
    files[0];
  return byName?.path ?? null;
}

/**
 * Read the primary `@altr/apolyx` component source for a docs demo.
 * Falls back to `null` when no registry item matches (composite form demos, etc.).
 */
export async function readKitSourceForDemo(demoName: string): Promise<string | null> {
  const name = await registryNameFromDemo(demoName);
  if (!name) return null;

  const root = uiKitRoot();
  const manifestPath = path.join(root, "registry", `${name}.json`);
  if (!existsSync(manifestPath)) return null;

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as RegistryManifest;
  const rel = pickPrimaryFile(manifest);
  if (!rel) return null;

  const full = path.join(root, rel);
  if (!existsSync(full)) return null;

  return readFile(full, "utf8");
}
