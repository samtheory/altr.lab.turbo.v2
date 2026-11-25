/** Pull a one-line `@altr/apolyx` import out of a demo file for the live strip. */

export function flattenImportToOneLine(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s*\{\s*/g, " { ")
    .replace(/\s*\}\s*/g, " }")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,(\s*})/g, "$1")
    .replace(/\s*;\s*$/g, ";")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Split demo/source into a single copyable import line + remaining body
 * (component definition / usage). Preserves body indentation.
 */
export function splitDemoSource(source: string): {
  importLine: string;
  body: string;
} {
  const text = source.replace(/\r\n/g, "\n").replace(/^\uFEFF/, "");
  const trimmedStart = text.replace(/^(?:\/\/[^\n]*\n|\s*\n)*/, "");

  const importBlock =
    /^(?:import\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s+["'][^"']+["']\s*;\s*)+/;

  const match = trimmedStart.match(importBlock);
  if (!match) {
    return { importLine: "", body: text.replace(/^\n+/, "").replace(/\n+$/, "") };
  }

  const rawImports = match[0];
  const rest = trimmedStart.slice(rawImports.length).replace(/^\n+/, "").replace(/\n+$/, "");

  // Prefer the kit import; fall back to the first import block flattened.
  const apolyx = [...rawImports.matchAll(/import\s+[\s\S]*?from\s+["']@altr\/apolyx["']\s*;/g)].at(
    -1,
  );
  const importLine = flattenImportToOneLine(apolyx?.[0] ?? rawImports);

  return { importLine, body: rest };
}
