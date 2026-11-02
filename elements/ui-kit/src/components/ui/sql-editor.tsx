"use client";

import * as React from "react";
import type * as Monaco from "monaco-editor";

import {
  buildSqlCompletionItems,
  fkJoinSuggestions,
  formatSql,
  isJoinConditionContext,
  sqlLanguageId,
  type SqlCompletionKind,
  type SqlCompletionModel,
  type SqlDialect,
} from "../../lib/sql-language";
import { cn } from "../../lib/utils";

export type SqlEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  /** Ctrl/Cmd + Enter while the editor has focus. */
  onRun?: () => void;
  dialect?: SqlDialect;
  /** Active project's completion model. `null` until introspection resolves. */
  model?: SqlCompletionModel | null;
  readOnly?: boolean;
  /** CSS length; defaults to a viewport-clamped height. */
  height?: string;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
};

type MonacoModule = typeof Monaco;

let enginePromise: Promise<MonacoModule> | null = null;
let workersConfigured = false;

function configureWorkers() {
  if (workersConfigured || typeof window === "undefined") return;
  workersConfigured = true;
  const scope = window as unknown as {
    MonacoEnvironment?: {
      getWorker?: (moduleId: string, label: string) => Worker;
    };
  };
  scope.MonacoEnvironment = {
    getWorker() {
      try {
        // The package `exports` map resolves this to
        // `monaco-editor/esm/vs/editor/editor.worker.js`.
        return new Worker(
          new URL("monaco-editor/editor/editor.worker.js", import.meta.url),
          { type: "module" },
        );
      } catch {
        // Worker unavailable (older bundler output): keep the editor usable.
        return new Worker(
          URL.createObjectURL(
            new Blob(["self.onmessage = function () {};"], {
              type: "text/javascript",
            }),
          ),
        );
      }
    },
  };
}

/**
 * Loads Monaco on demand. Split into its own chunk so the shell (and every
 * other Studio screen) never pays for the editor until it is mounted.
 */
export function loadSqlEditorEngine(): Promise<MonacoModule> {
  if (!enginePromise) {
    enginePromise = import("monaco-editor").then((mod) => {
      configureWorkers();
      return mod;
    });
  }
  return enginePromise;
}

function completionKind(monaco: MonacoModule, kind: SqlCompletionKind) {
  const kinds = monaco.languages.CompletionItemKind;
  switch (kind) {
    case "join":
      return kinds.Snippet;
    case "schema":
      return kinds.Module;
    case "table":
      return kinds.Struct;
    case "column":
      return kinds.Field;
    case "function":
      return kinds.Function;
    default:
      return kinds.Keyword;
  }
}

function currentTheme(): string {
  if (typeof document === "undefined") return "vs";
  return document.documentElement.classList.contains("dark") ? "vs-dark" : "vs";
}

/**
 * Apolyx SQL editor (Monaco). Dialect-aware highlighting, project-scoped
 * completion (keywords, functions, schemas, tables, typed columns, FK join
 * conditions), find/replace, multi-cursor, bracket matching, and Format
 * Document backed by `formatSql`.
 */
export function SqlEditor({
  value,
  onChange,
  onRun,
  dialect = "libsql",
  model = null,
  readOnly = false,
  height = "clamp(18rem, 52vh, 42rem)",
  className,
  ariaLabel = "SQL editor",
  placeholder,
}: SqlEditorProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const editorRef = React.useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<MonacoModule | null>(null);

  const valueRef = React.useRef(value);
  const dialectRef = React.useRef(dialect);
  const readOnlyRef = React.useRef(readOnly);
  const ariaLabelRef = React.useRef(ariaLabel);
  const placeholderRef = React.useRef(placeholder);
  const modelRef = React.useRef<SqlCompletionModel | null>(model);
  const onChangeRef = React.useRef(onChange);
  const onRunRef = React.useRef(onRun);

  valueRef.current = value;
  dialectRef.current = dialect;
  readOnlyRef.current = readOnly;
  ariaLabelRef.current = ariaLabel;
  placeholderRef.current = placeholder;
  modelRef.current = model;
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let editor: Monaco.editor.IStandaloneCodeEditor | null = null;
    let textModel: Monaco.editor.ITextModel | null = null;
    const disposables: Array<{ dispose: () => void }> = [];

    void (async () => {
      try {
        const monaco = await loadSqlEditorEngine();
        if (cancelled || !hostRef.current) return;
        monacoRef.current = monaco;

        const language = sqlLanguageId(dialectRef.current);
        textModel = monaco.editor.createModel(valueRef.current, language);
        editor = monaco.editor.create(hostRef.current, {
          model: textModel,
          theme: currentTheme(),
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineHeight: 20,
          tabSize: 2,
          insertSpaces: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          renderLineHighlight: "line",
          padding: { top: 14, bottom: 14 },
          wordWrap: "off",
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          suggest: { showWords: false },
          fixedOverflowWidgets: true,
          ariaLabel: ariaLabelRef.current,
          readOnly: readOnlyRef.current,
          placeholder: placeholderRef.current,
        });
        editorRef.current = editor;

        disposables.push(
          monaco.languages.registerCompletionItemProvider(language, {
            triggerCharacters: [" ", ".", '"'],
            provideCompletionItems: (doc, position) => {
              const current = modelRef.current;
              if (!current) return { suggestions: [] };
              const before = doc.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              });
              const word = doc.getWordUntilPosition(position);
              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
              };
              const items = [
                ...(isJoinConditionContext(before)
                  ? fkJoinSuggestions(current)
                  : []),
                ...buildSqlCompletionItems(current),
              ];
              return {
                suggestions: items.map((item) => ({
                  label: item.label,
                  kind: completionKind(monaco, item.kind),
                  insertText: item.insertText,
                  detail: item.detail,
                  documentation: item.documentation,
                  filterText: item.filterText,
                  sortText: item.sortText,
                  range,
                })),
              };
            },
          }),
          monaco.languages.registerDocumentFormattingEditProvider(language, {
            provideDocumentFormattingEdits: (doc) => {
              const source = doc.getValue();
              if (!source.trim()) return [];
              return [{ range: doc.getFullModelRange(), text: formatSql(source) }];
            },
          }),
        );

        disposables.push(
          editor.onDidChangeModelContent(() => {
            onChangeRef.current?.(editor?.getValue() ?? "");
          }),
        );
        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          () => onRunRef.current?.(),
        );

        setStatus("ready");
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to load the SQL editor",
        );
      }
    })();

    return () => {
      cancelled = true;
      for (const disposable of disposables) disposable.dispose();
      editor?.dispose();
      textModel?.dispose();
      editorRef.current = null;
      monacoRef.current = null;
    };
    // The editor is created once per mount; prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== value) editor.setValue(value);
  }, [value]);

  React.useEffect(() => {
    const monaco = monacoRef.current;
    const textModel = editorRef.current?.getModel();
    if (!monaco || !textModel) return;
    const next = sqlLanguageId(dialect);
    if (textModel.getLanguageId() !== next) {
      monaco.editor.setModelLanguage(textModel, next);
    }
  }, [dialect]);

  React.useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly,
      ariaLabel,
      placeholder: placeholder ?? "",
    });
  }, [readOnly, ariaLabel, placeholder]);

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      if (monacoRef.current) monacoRef.current.editor.setTheme(currentTheme());
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [status]);

  return (
    <div
      data-slot="sql-editor"
      data-dialect={dialect}
      className={cn(
        "relative overflow-hidden rounded-lg border border-border bg-background shadow-xs",
        className,
      )}
      style={{ height }}
    >
      <div ref={hostRef} className="h-full w-full" role="presentation" />
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Loading editor…
        </div>
      ) : null}
      {status === "error" ? (
        <div
          role="alert"
          className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
