import type * as React from "react";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

/** `## Heading` lines outside fenced code blocks. */
export function extractHeadings(source: string) {
  const headings: { id: string; title: string }[] = [];
  let inFence = false;
  for (const line of source.split(/\r?\n/)) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    if (inFence) continue;
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      const title = match[1]!.replace(/`/g, "");
      headings.push({ id: slugify(title), title });
    }
  }
  return headings;
}
