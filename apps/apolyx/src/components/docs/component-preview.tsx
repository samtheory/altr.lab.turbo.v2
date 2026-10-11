import { readFile } from "node:fs/promises";
import path from "node:path";

import { demos, type DemoName } from "@/demos";
import { highlight } from "@/lib/highlight";

import { PreviewTabs } from "./preview-tabs";

/** Renders a demo and shows the same file's source — no duplicated snippets. */
export async function ComponentPreview({
  name,
  align,
}: {
  name: DemoName;
  align?: "center" | "start";
}) {
  const Demo = demos[name];
  const raw = await readFile(path.join(process.cwd(), "src", "demos", `${name}.tsx`), "utf8");
  const code = raw.replace(/^"use client";\r?\n(\r?\n)?/, "");
  const html = await highlight(code, "tsx");
  return (
    <PreviewTabs code={code} html={html} align={align}>
      <Demo />
    </PreviewTabs>
  );
}
