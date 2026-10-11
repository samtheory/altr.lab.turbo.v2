import type { RegistryFile } from "./registry";

export { topoSort } from "./registry";

const FORBIDDEN = /from\s+["'](@altr\/|@radix-ui\/|@base-ui)[^"']*["']/;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `@/components/ui` + `button.tsx` → `@/components/ui/button` */
export function toModulePath(alias: string, target: string) {
  return `${alias.replace(/\/$/, "")}/${target.replace(/\.(tsx?|jsx?)$/, "")}`;
}

/**
 * Rewrites kit-relative imports using the registry's resolved import map.
 * `resolve` maps a kit source path (e.g. `src/lib/utils.ts`) to a consumer module path.
 */
export function rewriteImports(
  file: Pick<RegistryFile, "content" | "imports" | "path">,
  resolve: (kitPath: string) => string | undefined,
) {
  let out = file.content;
  for (const { specifier, path } of file.imports ?? []) {
    const next = resolve(path);
    if (!next) {
      throw new Error(`${file.path}: cannot place import "${specifier}" (${path})`);
    }
    out = out.replace(
      new RegExp(`(from\\s+|import\\s+|import\\(\\s*)(["'])${escapeRegExp(specifier)}\\2`, "g"),
      (_m, lead: string, q: string) => `${lead}${q}${next}${q}`,
    );
  }
  const leftover = out.match(FORBIDDEN);
  if (leftover) throw new Error(`${file.path}: forbidden import left after rewrite: ${leftover[0]}`);
  return out;
}
