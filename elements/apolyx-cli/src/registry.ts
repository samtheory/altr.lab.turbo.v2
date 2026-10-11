import { readFile } from "node:fs/promises";
import path from "node:path";

export type ItemType = "ui" | "primitive" | "motion" | "chart" | "lib" | "theme";

export type RegistryFile = {
  path: string;
  target: string;
  content: string;
  imports?: { specifier: string; path: string }[];
};

export type RegistryItem = {
  name: string;
  type: ItemType;
  title: string;
  description: string;
  files: RegistryFile[];
  dependencies?: Record<string, string>;
  registryDependencies?: string[];
  docs?: string;
};

export type RegistryIndexEntry = {
  name: string;
  type: ItemType;
  title: string;
  description: string;
};

const isUrl = (source: string) => /^https?:\/\//.test(source);

export async function readRegistryJson<T>(source: string, file: string): Promise<T> {
  if (isUrl(source)) {
    const url = `${source.replace(/\/$/, "")}/${file}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Registry request failed: ${url} (${res.status})`);
    return (await res.json()) as T;
  }
  const full = path.resolve(source, file);
  try {
    return JSON.parse(await readFile(full, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Registry item not found: ${full}`);
    }
    throw err;
  }
}

export function loadItem(source: string, name: string) {
  return readRegistryJson<RegistryItem>(source, `${name}.json`);
}

export function topoSort(names: string[], resolveDeps: (name: string) => string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const dep of resolveDeps(name)) visit(dep);
    ordered.push(name);
  };
  for (const name of names) visit(name);
  return ordered;
}

/** Loads the requested items plus their transitive registryDependencies, dependencies first. */
export async function resolveTree(
  names: string[],
  load: (name: string) => Promise<RegistryItem>,
) {
  const cache = new Map<string, RegistryItem>();
  const walk = async (name: string) => {
    if (cache.has(name)) return;
    const item = await load(name);
    cache.set(name, item);
    for (const dep of item.registryDependencies ?? []) await walk(dep);
  };
  for (const name of names) await walk(name);
  const order = topoSort(names, (n) => cache.get(n)?.registryDependencies ?? []);
  return order.map((n) => cache.get(n)!);
}
