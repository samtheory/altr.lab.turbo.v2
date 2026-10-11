import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addCssImports, collectDependencies, writeItems } from "./install";
import {
  defaultAliases,
  detectPackageManager,
  injectCssImports,
  readAtAliasBase,
  readConfig,
  stripJsonComments,
  writeConfig,
  type ApolyxConfig,
} from "./project";
import { resolveTree, type RegistryItem } from "./registry";

const registry: Record<string, RegistryItem> = {
  utils: {
    name: "utils",
    type: "lib",
    title: "utils",
    description: "",
    files: [{ path: "src/lib/utils.ts", target: "utils.ts", content: "export const cn = 1;\n" }],
    dependencies: { clsx: "^2.1.1" },
  },
  slot: {
    name: "slot",
    type: "primitive",
    title: "slot",
    description: "",
    files: [{ path: "src/primitives/slot.tsx", target: "slot.tsx", content: "export const Slot = 1;\n" }],
  },
  button: {
    name: "button",
    type: "ui",
    title: "button",
    description: "",
    registryDependencies: ["utils", "slot"],
    dependencies: { "class-variance-authority": "^0.7.1", clsx: "^2.1.1" },
    files: [
      {
        path: "src/components/ui/button.tsx",
        target: "button.tsx",
        content: `import { cn } from "../../lib/utils";\nimport { Slot } from "../../primitives/slot";\n`,
        imports: [
          { specifier: "../../lib/utils", path: "src/lib/utils.ts" },
          { specifier: "../../primitives/slot", path: "src/primitives/slot.tsx" },
        ],
      },
    ],
  },
  "theme-default": {
    name: "theme-default",
    type: "theme",
    title: "theme",
    description: "",
    files: [{ path: "src/styles/themes/default.css", target: "theme-default.css", content: ":root{}\n" }],
  },
};

const load = async (name: string) => {
  const item = registry[name];
  if (!item) throw new Error(`missing ${name}`);
  return structuredClone(item);
};

let cwd: string;
let config: ApolyxConfig;

beforeEach(async () => {
  cwd = await mkdtemp(path.join(tmpdir(), "apolyx-cli-"));
  await mkdir(path.join(cwd, "app"), { recursive: true });
  await writeFile(path.join(cwd, "app/globals.css"), '@import "tailwindcss";\n\nbody{}\n');
  config = { aliases: defaultAliases, css: "app/globals.css", theme: "default", registry: "unused" };
});

afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

describe("resolveTree", () => {
  it("returns dependencies before dependents", async () => {
    const items = await resolveTree(["button"], load);
    expect(items.map((i) => i.name)).toEqual(["utils", "slot", "button"]);
  });
});

describe("writeItems", () => {
  it("writes to alias dirs (no src) and rewrites imports", async () => {
    const items = await resolveTree(["button", "theme-default"], load);
    const res = await writeItems(items, { cwd, config, atBase: ".", overwrite: false });
    expect(res.written).toHaveLength(4);
    const button = await readFile(path.join(cwd, "components/ui/button.tsx"), "utf8");
    expect(button).toContain('from "@/lib/utils"');
    expect(button).toContain('from "@/components/apolyx/primitives/slot"');
    expect(res.cssImports).toEqual(["./apolyx/theme-default.css"]);
    expect(await readFile(path.join(cwd, "app/apolyx/theme-default.css"), "utf8")).toBe(":root{}\n");
  });

  it("guards existing files unless overwrite or confirmed", async () => {
    const items = await resolveTree(["utils"], load);
    const target = path.join(cwd, "lib/utils.ts");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, "custom");

    const kept = await writeItems(items, { cwd, config, atBase: ".", overwrite: false });
    expect(kept.skipped).toEqual([target]);
    expect(await readFile(target, "utf8")).toBe("custom");

    await writeItems(items, { cwd, config, atBase: ".", overwrite: false, confirmOverwrite: async () => true });
    expect(await readFile(target, "utf8")).toBe("export const cn = 1;\n");
  });
});

describe("css + config", () => {
  it("injects imports after tailwindcss once", async () => {
    await addCssImports(cwd, config, ["./apolyx/apolyx-tokens.css", "./apolyx/theme-default.css"]);
    await addCssImports(cwd, config, ["./apolyx/theme-default.css"]);
    const css = await readFile(path.join(cwd, "app/globals.css"), "utf8");
    expect(css).toBe(
      '@import "tailwindcss";\n@import "./apolyx/theme-default.css";\n@import "./apolyx/apolyx-tokens.css";\n\nbody{}\n',
    );
    expect(injectCssImports("body{}", ["./a.css"])).toBe('@import "./a.css";\nbody{}');
  });

  it("round-trips apolyx.json", async () => {
    await writeConfig(cwd, config);
    expect(await readConfig(cwd)).toEqual(config);
  });

  it("reads the @/* alias base from tsconfig with comments and globs", async () => {
    await writeFile(
      path.join(cwd, "tsconfig.json"),
      `{
        // comment
        "compilerOptions": { "paths": { "@/*": ["./src/*"] }, },
        "include": ["**/*.ts", "**/*.tsx"]
      }`,
    );
    expect(await readAtAliasBase(cwd)).toBe("src");
    expect(JSON.parse(stripJsonComments('{"a":"//x", /* c */ "b":1,}'))).toEqual({ a: "//x", b: 1 });
  });

  it("detects the package manager and merges dependencies", async () => {
    await writeFile(path.join(cwd, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(cwd)).toBe("pnpm");
    const items = await resolveTree(["button"], load);
    expect(collectDependencies(items)).toEqual({
      clsx: "^2.1.1",
      "class-variance-authority": "^0.7.1",
    });
  });
});
