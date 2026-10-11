import { codeToHtml } from "shiki";

export function highlight(code: string, lang: "tsx" | "bash" | "css" | "json" = "tsx") {
  return codeToHtml(code.trimEnd(), {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });
}
