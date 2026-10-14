"use client";

import * as React from "react";

import {
  applyMask,
  caretFromRaw,
  countTokens,
  defaultMaskTokens,
  isMaskComplete,
  maskGuide,
  parseMask,
  resolveMask,
  roughRaw,
  unmask,
  type MaskSource,
  type MaskTokens,
} from "../../lib/mask";
import { cn } from "../../lib/utils";
import { useComposedRefs } from "../../primitives/compose-refs";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useOptionalField } from "./field";
import { Input, type InputProps } from "./input";
import { InputGroupInput, useInInputGroup } from "./input-group";

export type UseMaskOptions = {
  mask: MaskSource;
  tokens?: MaskTokens;
  /** Raw value (token characters only). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (raw: string, formatted: string) => void;
  placeholderChar?: string;
};

type MaskState = { raw: string; parts: ReturnType<typeof parseMask> };

/**
 * Formats an input while typing. Spread `inputProps` on any `<input>`.
 * `raw` holds token characters only; `formatted` is what the user sees.
 */
export function useMask({
  mask,
  tokens = defaultMaskTokens,
  value,
  defaultValue = "",
  onValueChange,
  placeholderChar = "_",
}: UseMaskOptions) {
  const [rawState, setRaw] = useControllableState({ value, defaultValue });
  const partsFor = React.useCallback(
    (raw: string) => parseMask(resolveMask(mask, raw), tokens),
    [mask, tokens],
  );
  const parts = partsFor(rawState);
  const raw = unmask(applyMask(rawState, parts), parts);
  const formatted = applyMask(raw, parts);
  const complete = isMaskComplete(raw, parts);
  const guide = maskGuide(parts, placeholderChar);
  const numeric = parts.every((p) => p.kind === "literal" || p.char === "9");

  const inputRef = React.useRef<HTMLInputElement>(null);
  const pendingCaret = React.useRef<number | null>(null);
  const [caretTick, setCaretTick] = React.useState(0);
  const composing = React.useRef(false);
  const [composingText, setComposingText] = React.useState<string | null>(null);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    const rawCaret = pendingCaret.current;
    pendingCaret.current = null;
    if (!el || rawCaret === null || el.ownerDocument.activeElement !== el) return;
    const pos = caretFromRaw(parts, formatted, rawCaret);
    el.setSelectionRange(pos, pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caretTick]);

  const commit = (next: MaskState, rawCaret: number) => {
    const max = countTokens(next.parts);
    const nextRaw = next.raw.slice(0, max);
    const nextParts = partsFor(nextRaw);
    pendingCaret.current = Math.min(rawCaret, nextRaw.length);
    setCaretTick((t) => t + 1);
    if (nextRaw !== raw) {
      setRaw(nextRaw);
      onValueChange?.(nextRaw, applyMask(nextRaw, nextParts));
    }
  };

  const fromText = (text: string, caret: number) => {
    const p = partsFor(roughRaw(text, tokens));
    commit({ raw: unmask(text, p), parts: p }, unmask(text.slice(0, caret), p).length);
  };

  /** Raw index of a caret position in the formatted value. */
  const rawIndexAt = (pos: number) => unmask(formatted.slice(0, pos), parts).length;

  const inputProps = {
    ref: inputRef,
    value: composingText ?? formatted,
    inputMode: (numeric ? "numeric" : "text") as React.HTMLAttributes<HTMLInputElement>["inputMode"],
    placeholder: guide,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      if (composing.current) {
        setComposingText(text);
        return;
      }
      fromText(text, e.target.selectionStart ?? text.length);
    },
    onCompositionStart: () => {
      composing.current = true;
      setComposingText(formatted);
    },
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement>) => {
      composing.current = false;
      setComposingText(null);
      const el = e.currentTarget;
      fromText(el.value, el.selectionStart ?? el.value.length);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      if (start !== end) return;
      e.preventDefault();
      const at = rawIndexAt(start);
      if (e.key === "Backspace") {
        if (at === 0) return;
        const next = raw.slice(0, at - 1) + raw.slice(at);
        commit({ raw: next, parts: partsFor(next) }, at - 1);
      } else {
        if (at >= raw.length) return;
        const next = raw.slice(0, at) + raw.slice(at + 1);
        commit({ raw: next, parts: partsFor(next) }, at);
      }
    },
    onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const el = e.currentTarget;
      const before = raw.slice(0, rawIndexAt(el.selectionStart ?? formatted.length));
      const after = raw.slice(rawIndexAt(el.selectionEnd ?? formatted.length));
      let pasted = roughRaw(e.clipboardData.getData("text"), tokens);
      const max = countTokens(partsFor(before + pasted + after));
      // Replacing everything with a longer value (e.g. "+1 555 …"): keep the tail.
      if (!before && !after && pasted.length > max) pasted = pasted.slice(-max);
      const next = before + pasted + after;
      commit({ raw: next, parts: partsFor(next) }, before.length + pasted.length);
    },
  };

  return { inputProps, raw, formatted, complete, guide, parts };
}

export type MaskedInputProps = Omit<InputProps, "value" | "defaultValue" | "onChange"> & {
  mask: MaskSource;
  tokens?: MaskTokens;
  /** Raw value (token characters only). */
  value?: string;
  defaultValue?: string;
  onValueChange?: (raw: string, formatted: string) => void;
  placeholderChar?: string;
  /** Draws the rest of the mask in muted text behind the value. */
  showGuide?: boolean;
  /** What `name` submits. */
  submit?: "raw" | "formatted";
  /** Called with `complete` on blur, e.g. to mark the field invalid. */
  onCompleteChange?: (complete: boolean) => void;
};

/**
 * Input that formats while typing. Works standalone, inside a `Field`, and
 * inside an `InputGroup`. `value` is raw; `name` submits raw by default.
 */
export function MaskedInput({
  mask,
  tokens,
  value,
  defaultValue,
  onValueChange,
  placeholderChar,
  showGuide = false,
  submit = "raw",
  onCompleteChange,
  name,
  placeholder,
  className,
  onBlur,
  onKeyDown,
  ref,
  ...props
}: MaskedInputProps) {
  const field = useOptionalField();
  const inGroup = useInInputGroup();
  const embedded = Boolean(field) || inGroup;
  const { inputProps, raw, formatted, complete, guide } = useMask({
    mask,
    tokens,
    value,
    defaultValue,
    onValueChange,
    placeholderChar,
  });
  const { ref: maskRef, onKeyDown: maskKeyDown, ...maskProps } = inputProps;
  const composedRef = useComposedRefs(ref, maskRef);

  const inputRef = maskRef;
  const overlayRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const el = inputRef.current;
    const overlay = overlayRef.current;
    if (!showGuide || !el || !overlay) return;
    const sync = () => {
      const cs = getComputedStyle(el);
      overlay.style.left = `${el.offsetLeft + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft)}px`;
      overlay.style.font = cs.font;
      overlay.style.letterSpacing = cs.letterSpacing;
    };
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showGuide, inputRef]);

  const shared = {
    ...props,
    ...maskProps,
    ref: composedRef,
    placeholder: showGuide ? undefined : (placeholder ?? guide),
    "data-complete": complete ? "" : undefined,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (!e.defaultPrevented) maskKeyDown(e);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(e);
      onCompleteChange?.(complete);
    },
  };

  const control = embedded ? (
    <InputGroupInput {...shared} className={className} />
  ) : (
    <Input {...shared} className={className} />
  );

  const hidden = name ? (
    <input type="hidden" name={name} value={submit === "formatted" ? formatted : raw} />
  ) : null;

  if (!showGuide) {
    return (
      <>
        {control}
        {hidden}
      </>
    );
  }

  return (
    <span
      data-slot="masked-input"
      className={cn("relative", embedded ? "flex min-w-0 flex-1 self-stretch items-center" : "block w-full")}
    >
      {control}
      <span
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 flex items-center whitespace-pre"
      >
        <span className="text-transparent">{formatted}</span>
        <span className="text-muted-foreground/60">{guide.slice(formatted.length)}</span>
      </span>
      {hidden}
    </span>
  );
}
