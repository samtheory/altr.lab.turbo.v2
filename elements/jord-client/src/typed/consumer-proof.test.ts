/**
 * Consumer proof (S0088): the fixture app compiles against the fixture `Database`, and after a
 * simulated column rename (`title` -> `headline`) the same app has diagnostics. Uses the
 * TypeScript compiler API with an in-memory host over real lib files.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const files = ["builder.ts", "types.ts", "../table-fetch.ts", "fixtures/database.ts", "fixtures/consumer.ts"];

function diagnose(overrides: Record<string, (src: string) => string> = {}): string[] {
  const sources = new Map<string, string>();
  for (const f of files) {
    const abs = path.resolve(here, f).replaceAll("\\", "/");
    let src = readFileSync(abs, "utf8");
    const o = overrides[path.basename(f)];
    if (o) src = o(src);
    sources.set(abs, src);
  }
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  };
  const base = ts.createCompilerHost(options, true);
  const host: ts.CompilerHost = {
    ...base,
    fileExists: (f) => sources.has(f.replaceAll("\\", "/")) || base.fileExists(f),
    readFile: (f) => sources.get(f.replaceAll("\\", "/")) ?? base.readFile(f),
    getSourceFile: (f, lang, onErr, shouldCreate) => {
      const src = sources.get(f.replaceAll("\\", "/"));
      return src !== undefined
        ? ts.createSourceFile(f, src, lang, true)
        : base.getSourceFile(f, lang, onErr, shouldCreate);
    },
  };
  const entry = path.resolve(here, "fixtures/consumer.ts").replaceAll("\\", "/");
  const program = ts.createProgram([entry], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && sources.has(d.file.fileName.replaceAll("\\", "/")))
    .map((d) => `${path.basename(d.file!.fileName)}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
}

describe("consumer proof", () => {
  it("fixture app compiles against the fixture Database", () => {
    expect(diagnose()).toEqual([]);
  });

  it("renaming a column in the Database breaks the consumer typecheck", () => {
    const rename = (src: string) => src.replace(/\btitle\b/g, "headline");
    const diags = diagnose({ "database.ts": rename });
    console.log(diags.join("\n"));
    expect(diags.length).toBeGreaterThan(0);
    expect(diags.some((d) => d.startsWith("consumer.ts"))).toBe(true);
    expect(diags.join("\n")).toMatch(/title/);
  });
});
