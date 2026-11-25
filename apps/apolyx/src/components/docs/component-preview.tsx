import { readFile } from "node:fs/promises";
import path from "node:path";

import { demos, type DemoName } from "@/demos";
import { highlight } from "@/lib/highlight";
import { readKitSourceForDemo } from "@/lib/kit-source";

import { ComponentPlayground } from "./component-playground";

/** Renders a demo; Code tab shows the kit component source when available. */
export async function ComponentPreview({
  name,
  align,
}: {
  name: DemoName;
  align?: "center" | "start";
}) {
  const Demo = demos[name];
  const rawDemo = await readFile(path.join(process.cwd(), "src", "demos", `${name}.tsx`), "utf8");
  const demoCode = rawDemo.replace(/^"use client";\r?\n(\r?\n)?/, "");

  const kitRaw = await readKitSourceForDemo(name);
  const code = kitRaw
    ? kitRaw.replace(/^"use client";\r?\n(\r?\n)?/, "")
    : demoCode;
  const html = await highlight(code, "tsx");

  return (
    <ComponentPlayground name={name} demoCode={demoCode} code={code} html={html} align={align}>
      <Demo />
    </ComponentPlayground>
  );
}
