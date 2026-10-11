import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  aliasForType,
  aliasToFs,
  injectCssImports,
  THEME_DIR,
  type ApolyxConfig,
  type PackageManager,
} from "./project";
import type { RegistryItem } from "./registry";
import { rewriteImports, toModulePath } from "./rewrite";

export type WriteResult = {
  written: string[];
  skipped: string[];
  cssImports: string[];
};

export type WriteOptions = {
  cwd: string;
  config: ApolyxConfig;
  atBase: string | null;
  overwrite: boolean;
  /** Asked for each existing file when not overwriting; return true to replace. */
  confirmOverwrite?: (file: string) => Promise<boolean>;
};

/** Writes registry items (already in dependency order) into the consumer project. */
export async function writeItems(items: RegistryItem[], opts: WriteOptions): Promise<WriteResult> {
  const { cwd, config, atBase } = opts;
  const cssDir = path.dirname(path.join(cwd, config.css));

  const modulePathByKitPath = new Map<string, string>();
  for (const item of items) {
    if (item.type === "theme") continue;
    for (const file of item.files) {
      modulePathByKitPath.set(file.path, toModulePath(aliasForType(item.type, config), file.target));
    }
  }

  const result: WriteResult = { written: [], skipped: [], cssImports: [] };
  for (const item of items) {
    for (const file of item.files) {
      const outPath =
        item.type === "theme"
          ? path.join(cssDir, THEME_DIR, file.target)
          : path.join(aliasToFs(aliasForType(item.type, config), cwd, atBase), file.target);
      if (item.type === "theme") result.cssImports.push(`./${THEME_DIR}/${file.target}`);

      if (existsSync(outPath) && !opts.overwrite) {
        const replace = opts.confirmOverwrite ? await opts.confirmOverwrite(outPath) : false;
        if (!replace) {
          result.skipped.push(outPath);
          continue;
        }
      }
      const content =
        item.type === "theme"
          ? file.content
          : rewriteImports(file, (kitPath) => modulePathByKitPath.get(kitPath));
      await mkdir(path.dirname(outPath), { recursive: true });
      await writeFile(outPath, content);
      result.written.push(outPath);
    }
  }
  return result;
}

/** Theme palettes first, token mapping last. */
export function orderCssImports(imports: string[]) {
  const tokens = imports.filter((i) => i.endsWith("apolyx-tokens.css"));
  return [...imports.filter((i) => !i.endsWith("apolyx-tokens.css")), ...tokens];
}

export async function addCssImports(cwd: string, config: ApolyxConfig, imports: string[]) {
  if (!imports.length) return false;
  const cssPath = path.join(cwd, config.css);
  const css = existsSync(cssPath) ? await readFile(cssPath, "utf8") : '@import "tailwindcss";\n';
  const next = injectCssImports(css, orderCssImports(imports));
  if (next === css) return false;
  await mkdir(path.dirname(cssPath), { recursive: true });
  await writeFile(cssPath, next);
  return true;
}

export function collectDependencies(items: RegistryItem[]) {
  const deps: Record<string, string> = {};
  for (const item of items) Object.assign(deps, item.dependencies ?? {});
  return deps;
}

export async function missingDependencies(cwd: string, deps: Record<string, string>) {
  try {
    const pkg = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8"));
    const have = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.fromEntries(Object.entries(deps).filter(([name]) => !have[name]));
  } catch {
    return deps;
  }
}

export function installDependencies(pm: PackageManager, cwd: string, deps: Record<string, string>) {
  const specs = Object.entries(deps).map(([name, range]) => `${name}@${range}`);
  if (!specs.length) return { ok: true, command: "" };
  const verb = pm === "npm" ? "install" : "add";
  const res =
    process.platform === "win32"
      ? // npm/pnpm are .cmd shims on Windows and need a shell; quote so `^` ranges survive cmd.exe.
        spawnSync([pm, verb, ...specs.map((s) => `"${s}"`)].join(" "), {
          cwd,
          stdio: "inherit",
          shell: true,
        })
      : spawnSync(pm, [verb, ...specs], { cwd, stdio: "inherit" });
  return { ok: res.status === 0, command: `${pm} ${verb} ${specs.join(" ")}` };
}
