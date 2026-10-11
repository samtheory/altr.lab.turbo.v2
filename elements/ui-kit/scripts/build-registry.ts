import { existsSync, statSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryDir = path.join(root, "registry");
const outDir = path.join(root, "dist", "r");

const TYPES = ["ui", "primitive", "motion", "chart", "lib", "theme"] as const;
const BUILTIN = new Set(["react", "react-dom"]);
const FORBIDDEN = [/^@altr\//, /^@radix-ui\//, /^@base-ui/];

type FileEntry = { path: string; target: string };
type Manifest = {
  name: string;
  type: (typeof TYPES)[number];
  title: string;
  description: string;
  files: FileEntry[];
  dependencies?: Record<string, string>;
  registryDependencies?: string[];
  cssVars?: Record<string, unknown>;
  docs?: string;
};

const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function packageName(spec: string) {
  const parts = spec.split("/");
  return spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

function resolveRelative(fromPath: string, spec: string) {
  const target = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromPath), spec),
  );
  for (const candidate of [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}/index.ts`,
    `${target}/index.tsx`,
  ]) {
    const full = path.join(root, candidate);
    if (existsSync(full) && statSync(full).isFile()) return candidate;
  }
  return null;
}

function validate(m: Manifest, file: string, errors: string[]) {
  const where = `registry/${file}`;
  for (const key of ["name", "type", "title", "description"] as const) {
    if (typeof m[key] !== "string" || !m[key]) errors.push(`${where}: missing "${key}"`);
  }
  if (!TYPES.includes(m.type)) errors.push(`${where}: invalid type "${m.type}"`);
  if (`${m.name}.json` !== file) errors.push(`${where}: name "${m.name}" must match file name`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.name)) errors.push(`${where}: name must be kebab-case`);
  if (!Array.isArray(m.files) || m.files.length === 0) {
    errors.push(`${where}: "files" must be a non-empty array`);
  }
  for (const f of m.files ?? []) {
    if (!f.path || !f.target) errors.push(`${where}: file entries need path + target`);
    else if (!existsSync(path.join(root, f.path))) errors.push(`${where}: missing file ${f.path}`);
  }
}

async function main() {
  const entries = (await readdir(registryDir)).filter(
    (f) => f.endsWith(".json") && f !== "schema.json",
  );
  const errors: string[] = [];
  const manifests = new Map<string, Manifest>();
  for (const file of entries) {
    const manifest = JSON.parse(
      await readFile(path.join(registryDir, file), "utf8"),
    ) as Manifest & { $schema?: string };
    delete manifest.$schema;
    validate(manifest, file, errors);
    manifests.set(manifest.name, manifest);
  }

  const owner = new Map<string, string>();
  for (const m of manifests.values()) {
    for (const f of m.files) {
      const prev = owner.get(f.path);
      if (prev) errors.push(`${f.path} is listed in both "${prev}" and "${m.name}"`);
      owner.set(f.path, m.name);
    }
  }

  const closure = (name: string, seen = new Set<string>()) => {
    if (seen.has(name)) return seen;
    seen.add(name);
    for (const dep of manifests.get(name)?.registryDependencies ?? []) {
      if (!manifests.has(dep)) errors.push(`${name}: unknown registryDependency "${dep}"`);
      else closure(dep, seen);
    }
    return seen;
  };

  type OutFile = FileEntry & {
    content: string;
    imports?: { specifier: string; path: string }[];
  };
  const outputs: (Omit<Manifest, "files"> & { files: OutFile[] })[] = [];

  for (const m of manifests.values()) {
    const allowed = closure(m.name);
    const files: OutFile[] = [];
    for (const f of m.files) {
      if (!existsSync(path.join(root, f.path))) continue;
      const content = await readFile(path.join(root, f.path), "utf8");
      const out: OutFile = { ...f, content };
      if (/\.tsx?$/.test(f.path)) {
        const imports: { specifier: string; path: string }[] = [];
        for (const match of content.matchAll(IMPORT_RE)) {
          const spec = (match[1] ?? match[2] ?? match[3])!;
          if (spec.startsWith(".")) {
            const resolved = resolveRelative(f.path, spec);
            if (!resolved) {
              errors.push(`${m.name}: ${f.path} imports "${spec}" which does not exist`);
              continue;
            }
            const o = owner.get(resolved);
            if (!o) {
              errors.push(`${m.name}: ${f.path} imports ${resolved}, which no registry item ships`);
            } else if (!allowed.has(o)) {
              errors.push(
                `${m.name}: ${f.path} imports ${resolved} (item "${o}") — add "${o}" to registryDependencies`,
              );
            }
            imports.push({ specifier: spec, path: resolved });
          } else {
            if (FORBIDDEN.some((re) => re.test(spec))) {
              errors.push(`${m.name}: ${f.path} imports forbidden package "${spec}"`);
            }
            const pkg = packageName(spec);
            if (!BUILTIN.has(pkg) && !m.dependencies?.[pkg]) {
              errors.push(`${m.name}: ${f.path} imports "${pkg}" missing from dependencies`);
            }
          }
        }
        if (imports.length) out.imports = imports;
      }
      files.push(out);
    }
    outputs.push({ ...m, files });
  }

  if (errors.length) {
    console.error(`Registry validation failed (${errors.length}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const index = [];
  for (const item of outputs.sort((a, b) => a.name.localeCompare(b.name))) {
    await writeFile(
      path.join(outDir, `${item.name}.json`),
      JSON.stringify(item, null, 2),
    );
    index.push({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      registryDependencies: item.registryDependencies ?? [],
      docs: item.docs,
    });
  }
  await writeFile(path.join(outDir, "index.json"), JSON.stringify(index, null, 2));
  console.log(`Registry OK — wrote ${index.length} items to dist/r (imports resolved)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
