"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button, cn } from "@altr/apolyx";

type Kind =
  | "keyword"
  | "tag"
  | "attr"
  | "string"
  | "punct"
  | "text"
  | "plain"
  | "comment"
  | "number";

type Piece = { kind: Kind; value: string };

const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "default",
  "function",
  "return",
  "const",
  "let",
  "var",
  "type",
  "interface",
  "as",
  "of",
  "in",
  "if",
  "else",
  "true",
  "false",
  "null",
  "undefined",
  "new",
  "class",
  "extends",
  "async",
  "await",
  "typeof",
  "keyof",
  "readonly",
  "satisfies",
]);

/**
 * Tiny client-side TSX tokenizer for the live playground strip.
 * Preserves indentation / newlines for readable multiline JSX.
 */
export function tokenizeJsx(source: string): Piece[] {
  const input = source
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
  return tokenizeChunk(input);
}

function tokenizeChunk(input: string): Piece[] {
  const pieces: Piece[] = [];
  let i = 0;

  const push = (kind: Kind, value: string) => {
    if (!value) return;
    const last = pieces[pieces.length - 1];
    if (last && last.kind === kind) last.value += value;
    else pieces.push({ kind, value });
  };

  while (i < input.length) {
    const ch = input[i]!;

    if (ch === "\n") {
      push("plain", "\n");
      i += 1;
      continue;
    }

    if (ch === "/" && input[i + 1] === "/") {
      const end = input.indexOf("\n", i);
      const stop = end === -1 ? input.length : end;
      push("comment", input.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === "/" && input[i + 1] === "*") {
      const end = input.indexOf("*/", i + 2);
      const stop = end === -1 ? input.length : end + 2;
      push("comment", input.slice(i, stop));
      i = stop;
      continue;
    }

    if (ch === "<" && /[A-Za-z/!]/.test(input[i + 1] ?? "")) {
      push("punct", "<");
      i += 1;
      if (input[i] === "/") {
        push("punct", "/");
        i += 1;
      }
      const start = i;
      while (i < input.length && /[\w.]/.test(input[i]!)) i += 1;
      push("tag", input.slice(start, i));
      continue;
    }

    if (ch === "/" && input[i + 1] === ">") {
      push("punct", "/>");
      i += 2;
      continue;
    }

    if (ch === ">") {
      push("punct", ">");
      i += 1;
      continue;
    }

    if (ch === "=") {
      push("punct", "=");
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < input.length) {
        if (input[j] === "\\") {
          j += 2;
          continue;
        }
        if (input[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      push("string", input.slice(i, j));
      i = j;
      continue;
    }

    if (ch === "{") {
      let depth = 1;
      let j = i + 1;
      while (j < input.length && depth > 0) {
        const c = input[j]!;
        if (c === '"' || c === "'" || c === "`") {
          const q = c;
          j += 1;
          while (j < input.length) {
            if (input[j] === "\\") {
              j += 2;
              continue;
            }
            if (input[j] === q) {
              j += 1;
              break;
            }
            j += 1;
          }
          continue;
        }
        if (c === "{") depth += 1;
        else if (c === "}") depth -= 1;
        if (depth > 0) j += 1;
      }
      push("punct", "{");
      const inner = input.slice(i + 1, j);
      for (const piece of tokenizeChunk(inner)) push(piece.kind, piece.value);
      if (j < input.length && input[j] === "}") {
        push("punct", "}");
        i = j + 1;
      } else {
        i = j;
      }
      continue;
    }

    if (
      ch === "}" ||
      ch === "(" ||
      ch === ")" ||
      ch === "[" ||
      ch === "]" ||
      ch === "," ||
      ch === ";" ||
      ch === ":"
    ) {
      push("punct", ch);
      i += 1;
      continue;
    }

    if (/\d/.test(ch)) {
      const start = i;
      while (i < input.length && /[\d._]/.test(input[i]!)) i += 1;
      push("number", input.slice(start, i));
      continue;
    }

    if (/\s/.test(ch)) {
      push("plain", ch);
      i += 1;
      continue;
    }

    if (/[A-Za-z_$@]/.test(ch)) {
      const start = i;
      while (i < input.length && /[\w$]/.test(input[i]!)) i += 1;
      const word = input.slice(start, i);
      const rest = input.slice(i).trimStart();

      if (KEYWORDS.has(word)) {
        push("keyword", word);
      } else if (
        rest.startsWith("=") ||
        rest.startsWith(">") ||
        rest.startsWith("/") ||
        rest.startsWith("{")
      ) {
        push("attr", word);
      } else if (/^[A-Z]/.test(word)) {
        push("tag", word);
      } else {
        push("text", word);
      }
      continue;
    }

    push("plain", ch);
    i += 1;
  }

  return pieces;
}

const KIND_CLASS: Record<Kind, string> = {
  keyword: "text-warning",
  tag: "text-info",
  attr: "text-primary",
  string: "text-success",
  punct: "text-muted-foreground",
  text: "text-foreground/90",
  plain: "text-foreground/80",
  comment: "text-muted-foreground/70 italic",
  number: "text-destructive",
};

const SHELL_RUNNERS = new Set([
  "pnpm",
  "npm",
  "npx",
  "yarn",
  "bun",
  "bunx",
  "dlx",
]);

const SHELL_VERBS = new Set(["add", "init", "update", "diff", "list"]);

/**
 * Colorize CLI install lines like `pnpm dlx apolyx add card`.
 * Highlights the package manager, `apolyx`, the verb, and the registry name.
 */
export function tokenizeShell(source: string): Piece[] {
  const input = source.replace(/\r\n/g, "\n").trim();
  const pieces: Piece[] = [];
  let i = 0;
  let afterVerb = false;

  const push = (kind: Kind, value: string) => {
    if (!value) return;
    const last = pieces[pieces.length - 1];
    if (last && last.kind === kind) last.value += value;
    else pieces.push({ kind, value });
  };

  while (i < input.length) {
    const ch = input[i]!;

    if (/\s/.test(ch)) {
      push("plain", ch);
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < input.length && input[j] !== quote) {
        if (input[j] === "\\") j += 2;
        else j += 1;
      }
      if (j < input.length) j += 1;
      push("string", input.slice(i, j));
      i = j;
      continue;
    }

    if (ch === "-" && input[i + 1] === "-") {
      const start = i;
      i += 2;
      while (i < input.length && /[\w-]/.test(input[i]!)) i += 1;
      push("attr", input.slice(start, i));
      continue;
    }

    if (ch === "$" || ch === ";" || ch === "|" || ch === "&") {
      push("punct", ch);
      i += 1;
      continue;
    }

    if (/[\w@./]/.test(ch)) {
      const start = i;
      while (i < input.length && /[\w@./-]/.test(input[i]!)) i += 1;
      const word = input.slice(start, i);

      if (word === "apolyx" || word === "@altr/apolyx") {
        push("tag", word);
      } else if (SHELL_RUNNERS.has(word)) {
        push("keyword", word);
      } else if (SHELL_VERBS.has(word)) {
        push("attr", word);
        afterVerb = true;
      } else if (afterVerb || word.startsWith("@")) {
        // Registry item name(s) after `add` — make them pop
        push("string", word);
      } else {
        push("text", word);
      }
      continue;
    }

    push("plain", ch);
    i += 1;
  }

  return pieces;
}

/** Shared colored mono for install prompts + JSX strips. */
export function ColoredCode({
  code,
  lang = "tsx",
  className,
}: {
  code: string;
  lang?: "tsx" | "shell";
  className?: string;
}) {
  const pieces = React.useMemo(
    () => (lang === "shell" ? tokenizeShell(code) : tokenizeJsx(code)),
    [code, lang],
  );

  return (
    <code className={cn("whitespace-pre font-mono tracking-tight", className)}>
      {pieces.map((piece, index) => (
        <span key={`${index}-${piece.kind}`} className={KIND_CLASS[piece.kind]}>
          {piece.value}
        </span>
      ))}
    </code>
  );
}

function SnippetRow({
  badge,
  badgeClassName,
  code,
  copied,
  onCopy,
  copyLabel,
  monoClassName,
}: {
  badge: React.ReactNode;
  badgeClassName?: string;
  code: string;
  copied?: boolean;
  onCopy?: () => void | Promise<void>;
  copyLabel: string;
  monoClassName?: string;
}) {
  const pieces = React.useMemo(() => tokenizeJsx(code), [code]);

  return (
    <div className="grid min-w-0 grid-cols-[6.5rem_1.75rem_minmax(0,1fr)] items-start gap-x-2">
      <span
        className={cn(
          "mt-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
          badgeClassName,
        )}
      >
        {badge}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={copied ? "Copied" : `Copy ${copyLabel}`}
        className="mt-0.5 size-7 shrink-0 justify-self-center text-muted-foreground hover:text-foreground"
        onClick={() => void onCopy?.()}
      >
        {copied ? (
          <Check className="size-3.5 text-success" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </Button>

      <button
        type="button"
        onClick={() => void onCopy?.()}
        aria-label={copied ? `${copyLabel} copied` : `Click to copy ${copyLabel}`}
        className={cn(
          "group min-w-0 overflow-x-auto rounded-lg border border-transparent px-2.5 py-1.5 text-left",
          "bg-background/40 transition-[background-color,border-color,box-shadow] duration-200",
          "hover:border-primary/25 hover:bg-primary/5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "active:border-primary/40 active:bg-primary/10",
          copied && "border-success/35 bg-success/10",
        )}
      >
        <code
          className={cn(
            "block whitespace-pre font-mono text-[12px] leading-[1.65] tracking-tight",
            monoClassName,
          )}
        >
          {pieces.map((piece, index) => (
            <span key={`${index}-${piece.kind}`} className={KIND_CLASS[piece.kind]}>
              {piece.value}
            </span>
          ))}
        </code>
        <span className="sr-only">{code}</span>
      </button>
    </div>
  );
}

/** Live strip: one-line import (optional) + indented usage / component source. */
export function JsxSnippet({
  importLine,
  code,
  importCopied,
  usageCopied,
  onCopyImport,
  onCopyUsage,
  className,
}: {
  importLine?: string;
  code: string;
  importCopied?: boolean;
  usageCopied?: boolean;
  onCopyImport?: () => void | Promise<void>;
  onCopyUsage?: () => void | Promise<void>;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2", className)}>
      {importLine ? (
        <SnippetRow
          badge={<span className="text-info">import</span>}
          code={importLine}
          copied={importCopied}
          onCopy={onCopyImport}
          copyLabel="import"
        />
      ) : null}
      <SnippetRow
        badge={
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="text-warning">jsx</span>
            <span className="text-border">·</span>
            <span className={usageCopied ? "text-success" : "text-destructive"}>
              {usageCopied ? "copied" : "usage"}
            </span>
          </span>
        }
        code={code}
        copied={usageCopied}
        onCopy={onCopyUsage}
        copyLabel="JSX"
      />
    </div>
  );
}
