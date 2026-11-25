import type { ThemeRegistration } from "shiki";

/**
 * Apolyx docs highlighter — mirrors the live JSX strip tokens:
 * keywords amber, components sky, attrs blue, strings green, numbers coral.
 * No purple / neon glow.
 */

type Palette = {
  bg: string;
  fg: string;
  comment: string;
  keyword: string;
  string: string;
  number: string;
  tag: string;
  fn: string;
  attr: string;
  variable: string;
  punct: string;
  operator: string;
  constant: string;
};

function theme(name: string, type: "light" | "dark", c: Palette): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.fg,
      "editorLineNumber.foreground": c.comment,
      "editorCursor.foreground": c.keyword,
      "editor.selectionBackground": type === "light" ? "#0ea5e920" : "#38bdf830",
    },
    settings: [
      { settings: { foreground: c.fg } },
      {
        scope: [
          "comment",
          "punctuation.definition.comment",
          "string.comment",
        ],
        settings: { foreground: c.comment, fontStyle: "italic" },
      },
      {
        scope: [
          "keyword",
          "keyword.control",
          "keyword.operator.new",
          "storage",
          "storage.type",
          "storage.modifier",
          "constant.language",
        ],
        settings: { foreground: c.keyword },
      },
      {
        scope: [
          "string",
          "string.quoted",
          "string.template",
          "punctuation.definition.string",
        ],
        settings: { foreground: c.string },
      },
      {
        scope: [
          "constant.numeric",
          "constant.numeric.integer",
          "constant.numeric.float",
          "keyword.other.unit",
        ],
        settings: { foreground: c.number },
      },
      {
        scope: [
          "constant.language.boolean",
          "constant.language.null",
          "constant.language.undefined",
          "support.constant",
        ],
        settings: { foreground: c.constant },
      },
      {
        scope: [
          "entity.name.tag",
          "support.class.component",
          "support.class.component.tsx",
          "support.class.component.jsx",
          "entity.name.type",
          "entity.name.type.class",
          "entity.name.type.interface",
          "support.class",
          "support.type",
          "entity.other.inherited-class",
        ],
        settings: { foreground: c.tag },
      },
      {
        scope: [
          "entity.name.function",
          "support.function",
          "meta.function-call",
          "meta.function-call entity.name.function",
        ],
        settings: { foreground: c.fn },
      },
      {
        scope: [
          "entity.other.attribute-name",
          "entity.other.attribute-name.tsx",
          "entity.other.attribute-name.jsx",
          "meta.tag.attributes",
        ],
        settings: { foreground: c.attr },
      },
      {
        scope: [
          "variable",
          "variable.other",
          "variable.other.readwrite",
          "variable.parameter",
          "meta.definition.variable",
        ],
        settings: { foreground: c.variable },
      },
      {
        scope: [
          "punctuation",
          "meta.brace",
          "punctuation.definition.tag",
          "punctuation.separator",
          "punctuation.terminator",
          "meta.jsx.children",
        ],
        settings: { foreground: c.punct },
      },
      {
        scope: [
          "keyword.operator",
          "keyword.operator.assignment",
          "keyword.operator.comparison",
          "keyword.operator.arithmetic",
          "keyword.operator.logical",
        ],
        settings: { foreground: c.operator },
      },
      {
        scope: ["support.type.primitive", "support.type.builtin"],
        settings: { foreground: c.tag },
      },
      {
        scope: ["invalid", "invalid.illegal"],
        settings: { foreground: c.number },
      },
    ],
  };
}

/** Cool stone paper — amber keywords, sky components, green strings. */
export const apolyxLight = theme("apolyx-light", "light", {
  bg: "#f4f6f8",
  fg: "#1c2430",
  comment: "#8b95a5",
  keyword: "#b45309",
  string: "#0f7a45",
  number: "#c2410c",
  tag: "#0369a1",
  fn: "#0e7490",
  attr: "#1d4ed8",
  variable: "#334155",
  punct: "#64748b",
  operator: "#a16207",
  constant: "#be123c",
});

/** Deep slate night — same roles, lifted chroma for dark UI. */
export const apolyxDark = theme("apolyx-dark", "dark", {
  bg: "#121820",
  fg: "#e8eef6",
  comment: "#7d8a9c",
  keyword: "#fbbf24",
  string: "#4ade80",
  number: "#fb923c",
  tag: "#38bdf8",
  fn: "#22d3ee",
  attr: "#93c5fd",
  variable: "#cbd5e1",
  punct: "#94a3b8",
  operator: "#fcd34d",
  constant: "#fb7185",
});
