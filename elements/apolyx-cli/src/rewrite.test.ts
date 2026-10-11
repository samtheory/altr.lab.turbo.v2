import { describe, expect, it } from "vitest";

import { rewriteImports, toModulePath, topoSort } from "./rewrite";

describe("rewriteImports", () => {
  it("rewrites kit-relative paths using the resolved import map", () => {
    const content = [
      `import { cn } from "../../lib/utils";`,
      `import { Slot } from '../../primitives/slot';`,
      `import type { Side } from "../../primitives/position";`,
      `import { Slot as Other } from "../../primitives/slotted";`,
    ].join("\n");
    const out = rewriteImports(
      {
        path: "src/components/ui/button.tsx",
        content,
        imports: [
          { specifier: "../../lib/utils", path: "src/lib/utils.ts" },
          { specifier: "../../primitives/slot", path: "src/primitives/slot.tsx" },
          { specifier: "../../primitives/position", path: "src/primitives/position.ts" },
        ],
      },
      (kitPath) =>
        ({
          "src/lib/utils.ts": "@/lib/utils",
          "src/primitives/slot.tsx": "@/components/apolyx/primitives/slot",
          "src/primitives/position.ts": "@/components/apolyx/primitives/position",
        })[kitPath],
    );
    expect(out).toContain('from "@/lib/utils"');
    expect(out).toContain("from '@/components/apolyx/primitives/slot'");
    expect(out).toContain('from "@/components/apolyx/primitives/position"');
    expect(out).toContain('from "../../primitives/slotted"');
  });

  it("fails when an import cannot be placed or a forbidden package remains", () => {
    expect(() =>
      rewriteImports(
        {
          path: "x.tsx",
          content: `import { a } from "./a";`,
          imports: [{ specifier: "./a", path: "src/a.ts" }],
        },
        () => undefined,
      ),
    ).toThrow(/cannot place/);
    expect(() =>
      rewriteImports(
        { path: "x.tsx", content: `import { b } from "@radix-ui/react-slot";` },
        () => undefined,
      ),
    ).toThrow(/forbidden/);
  });
});

describe("toModulePath", () => {
  it("joins alias and target without extension", () => {
    expect(toModulePath("@/components/ui/", "button.tsx")).toBe("@/components/ui/button");
    expect(toModulePath("@/lib", "utils.ts")).toBe("@/lib/utils");
  });
});

describe("topoSort", () => {
  it("orders registry dependencies first and de-duplicates", () => {
    const deps: Record<string, string[]> = {
      button: ["utils", "slot"],
      dialog: ["slot", "utils"],
      slot: ["compose-refs"],
      "compose-refs": [],
      utils: [],
    };
    expect(topoSort(["button", "dialog"], (n) => deps[n] ?? [])).toEqual([
      "utils",
      "compose-refs",
      "slot",
      "button",
      "dialog",
    ]);
  });
});
