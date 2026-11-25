import { codeToHtml } from "shiki";

import { apolyxDark, apolyxLight } from "./apolyx-shiki-themes";

export function highlight(code: string, lang: "tsx" | "bash" | "css" | "json" = "tsx") {
  return codeToHtml(code.trimEnd(), {
    lang,
    themes: {
      light: apolyxLight,
      dark: apolyxDark,
    },
    defaultColor: "light",
  });
}
