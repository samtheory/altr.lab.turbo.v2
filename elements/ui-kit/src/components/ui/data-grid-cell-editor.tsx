"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Switch } from "./switch";
import { Textarea } from "./textarea";
import {
  draftFromCellValue,
  parseTypedCellDraft,
} from "./data-grid-edit";
import type {
  DataGridColumnType,
  DataGridEditorKind,
  DataGridEditorOption,
} from "./data-grid-types";

export type DataGridCellEditorProps = {
  type?: DataGridColumnType;
  editor?: DataGridEditorKind;
  editorOptions?: DataGridEditorOption[];
  value: unknown;
  onCommit: (next: unknown) => void;
  onCancel: () => void;
  onTab?: (direction: 1 | -1) => void;
  className?: string;
};

function resolveEditor(
  type: DataGridColumnType | undefined,
  editor: DataGridEditorKind | undefined,
): DataGridEditorKind {
  if (editor) return editor;
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "date") return "date";
  if (type === "json") return "json";
  if (type === "fk") return "fk";
  return "text";
}

export function DataGridCellEditor({
  type,
  editor,
  editorOptions,
  value,
  onCommit,
  onCancel,
  onTab,
  className,
}: DataGridCellEditorProps) {
  const kind = resolveEditor(type, editor);
  const [draft, setDraft] = React.useState(() =>
    draftFromCellValue(type, value),
  );
  const [localError, setLocalError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const settledRef = React.useRef(false);

  React.useEffect(() => {
    inputRef.current?.focus();
    if (
      inputRef.current &&
      "select" in inputRef.current &&
      kind !== "boolean"
    ) {
      inputRef.current.select();
    }
  }, [kind]);

  function finishCancel() {
    if (settledRef.current) return;
    settledRef.current = true;
    onCancel();
  }

  function commitDraft(raw: string = draft) {
    if (settledRef.current) return;
    try {
      const next = parseTypedCellDraft(
        kind === "number"
          ? "number"
          : kind === "boolean"
            ? "boolean"
            : kind === "json"
              ? "json"
              : type,
        raw,
      );
      if (Object.is(next, value) || (next === null && value == null)) {
        finishCancel();
        return;
      }
      if (
        typeof next === "string" &&
        typeof value === "string" &&
        next === value
      ) {
        finishCancel();
        return;
      }
      if (typeof next === "number" && typeof value === "number" && next === value) {
        finishCancel();
        return;
      }
      if (typeof next === "boolean" && typeof value === "boolean" && next === value) {
        finishCancel();
        return;
      }
      setLocalError(null);
      settledRef.current = true;
      onCommit(next);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid value");
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finishCancel();
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && kind !== "json") {
      event.preventDefault();
      event.stopPropagation();
      commitDraft();
      return;
    }
    if (event.key === "Enter" && event.metaKey && kind === "json") {
      event.preventDefault();
      event.stopPropagation();
      commitDraft();
      return;
    }
    if (event.key === "Tab" && onTab) {
      event.preventDefault();
      event.stopPropagation();
      commitDraft();
      onTab(event.shiftKey ? -1 : 1);
    }
  }

  if (kind === "boolean") {
    const checked = value === true;
    return (
      <div
        className={cn("flex w-full items-center gap-2 px-1", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <Switch
          checked={checked}
          onCheckedChange={(next) => {
            if (settledRef.current) return;
            settledRef.current = true;
            onCommit(next);
          }}
          aria-label="Toggle boolean"
          size="sm"
        />
        <button
          type="button"
          className="text-[10px] text-muted-foreground underline"
          onClick={finishCancel}
        >
          Esc
        </button>
      </div>
    );
  }

  if (kind === "select" && editorOptions && editorOptions.length > 0) {
    return (
      <div
        className={cn("w-full px-0.5", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <Select
          value={draft === "" ? "__null__" : draft}
          onValueChange={(v) => {
            const next = v === "__null__" ? "" : v;
            setDraft(next);
            commitDraft(next);
          }}
        >
          <SelectTrigger size="sm" className="h-7 w-full font-mono text-xs">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__null__">(null)</SelectItem>
            {editorOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (kind === "json") {
    return (
      <div
        className={cn("flex w-full flex-col gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
      >
        <Textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft === draftFromCellValue(type, value)) {
              finishCancel();
              return;
            }
            commitDraft();
          }}
          aria-invalid={localError ? true : undefined}
          className="min-h-16 resize-y font-mono text-[11px]"
          size="sm"
        />
        {localError ? (
          <span className="px-1 text-[10px] text-destructive">{localError}</span>
        ) : (
          <span className="px-1 text-[10px] text-muted-foreground">
            ⌘/Ctrl+Enter to save
          </span>
        )}
      </div>
    );
  }

  const inputType =
    kind === "number" ? "number" : kind === "date" ? "date" : "text";

  return (
    <div
      className={cn("flex w-full flex-col", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <Input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        value={draft}
        size="sm"
        className="h-7 font-mono text-xs"
        aria-invalid={localError ? true : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft === draftFromCellValue(type, value)) {
            finishCancel();
            return;
          }
          commitDraft();
        }}
      />
      {localError ? (
        <span className="px-1 text-[10px] text-destructive">{localError}</span>
      ) : null}
    </div>
  );
}
