import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ItemType } from "./registry";

export const THEMES = ["default", "power-blue", "power-green"] as const;
export type ThemeFamily = (typeof THEMES)[number];

export type ApolyxConfig = {
  $schema?: string;
  aliases: {
    ui: string;
    primitives: string;
    lib: string;
    motion: string;
    charts: string;
  };
  /** Project-relative path of the Tailwind entry CSS file. */
  css: string;
  theme: ThemeFamily;
  registry: string;
};

export const CONFIG_FILE = "apolyx.json";

export const defaultAliases: ApolyxConfig["aliases"] = {
  ui: "@/components/ui",
  primitives: "@/components/apolyx/primitives",
  lib: "@/lib",
  motion: "@/components/apolyx/motion",
  charts: "@/components/apolyx/charts",
};

export async function readConfig(cwd: string): Promise<ApolyxConfig | null> {
  try {
    return JSON.parse(await readFile(path.join(cwd, CONFIG_FILE), "utf8")) as ApolyxConfig;
  } catch {
    return null;
  }
}

export async function writeConfig(cwd: string, config: ApolyxConfig) {
  await writeFile(path.join(cwd, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
}

/** JSONC → JSON: drops comments outside strings and trailing commas. */
export function stripJsonComments(source: string) {
  let out = "";
  let inString = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (inString) {
      out += ch;
      if (ch === "\\") out += source[++i] ?? "";
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i++;
    } else {
      out += ch;
    }
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/** Directory (relative to cwd) that `@/*` points at, from tsconfig/jsconfig paths. */
export async function readAtAliasBase(cwd: string): Promise<string | null> {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const file = path.join(cwd, name);
    if (!existsSync(file)) continue;
    try {
      const json = JSON.parse(stripJsonComments(await readFile(file, "utf8")));
      const baseUrl: string = json.compilerOptions?.baseUrl ?? ".";
      const target: string | undefined = json.compilerOptions?.paths?.["@/*"]?.[0];
      if (!target) return null;
      return path.posix.normalize(path.posix.join(baseUrl, target.replace(/\/\*$/, "")));
    } catch {
      return null;
    }
  }
  return null;
}

/** Maps an alias like `@/components/ui` to an absolute directory. */
export function aliasToFs(alias: string, cwd: string, atBase: string | null) {
  if (alias.startsWith("@/")) {
    const base = atBase ?? (existsSync(path.join(cwd, "src")) ? "src" : ".");
    return path.join(cwd, base, alias.slice(2));
  }
  return path.join(cwd, alias);
}

export function detectCssFile(cwd: string) {
  for (const candidate of [
    "src/app/globals.css",
    "app/globals.css",
    "src/styles/globals.css",
    "styles/globals.css",
    "src/index.css",
    "src/main.css",
  ]) {
    if (existsSync(path.join(cwd, candidate))) return candidate;
  }
  return null;
}

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export function detectPackageManager(cwd: string): PackageManager {
  let dir = cwd;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(path.join(dir, "bun.lockb")) || existsSync(path.join(dir, "bun.lock"))) return "bun";
    if (existsSync(path.join(dir, "yarn.lock"))) return "yarn";
    if (existsSync(path.join(dir, "package-lock.json"))) return "npm";
    const parent = path.dirname(dir);
    if (parent === dir) return "npm";
    dir = parent;
  }
}

export function aliasForType(type: Exclude<ItemType, "theme">, config: ApolyxConfig) {
  switch (type) {
    case "lib":
      return config.aliases.lib;
    case "primitive":
      return config.aliases.primitives;
    case "motion":
      return config.aliases.motion;
    case "chart":
      return config.aliases.charts;
    default:
      return config.aliases.ui;
  }
}

/** Directory (relative to the CSS file) where theme CSS is written. */
export const THEME_DIR = "apolyx";

/**
 * Adds `@import` lines right after `@import "tailwindcss"` (or at the top).
 * Idempotent: existing imports are left untouched.
 */
export function injectCssImports(css: string, imports: string[]) {
  const missing = imports.filter((imp) => !css.includes(`"${imp}"`) && !css.includes(`'${imp}'`));
  if (!missing.length) return css;
  const lines = missing.map((imp) => `@import "${imp}";`).join("\n");
  const anchor = css.match(/@import\s+["']tailwindcss["'][^;]*;\r?\n?/);
  if (anchor && anchor.index !== undefined) {
    const at = anchor.index + anchor[0].length;
    const sep = anchor[0].endsWith("\n") ? "" : "\n";
    return `${css.slice(0, at)}${sep}${lines}\n${css.slice(at)}`;
  }
  return `${lines}\n${css}`;
}
