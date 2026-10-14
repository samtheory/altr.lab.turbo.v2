"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useComposedRefs } from "../../primitives/compose-refs";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import type { ControlSize } from "./control-box";
import { useOptionalField } from "./field";

export type InputOTPPattern = "digits" | "alphanumeric" | "alpha" | RegExp;

const patternChar: Record<Exclude<InputOTPPattern, RegExp>, RegExp> = {
  digits: /^\d$/,
  alpha: /^[A-Za-z]$/,
  alphanumeric: /^[A-Za-z0-9]$/,
};

/** Keeps only characters the pattern allows, after the case transform. */
export function sanitizeOTP(text: string, pattern: InputOTPPattern, transform: "upper" | "none") {
  const test = typeof pattern === "string" ? patternChar[pattern] : pattern;
  const cased = transform === "upper" ? text.toUpperCase() : text;
  let out = "";
  for (const ch of cased) {
    test.lastIndex = 0;
    if (test.test(ch)) out += ch;
  }
  return out;
}

type OTPContextValue = {
  value: string;
  activeIndex: number | null;
  mask: boolean;
  invalid: boolean;
  size: ControlSize;
  tone: "default" | "success";
};

const OTPContext = React.createContext<OTPContextValue | null>(null);

function useOTP() {
  const ctx = React.useContext(OTPContext);
  if (!ctx) throw new Error("InputOTP parts must be used within InputOTP");
  return ctx;
}

export type InputOTPProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "pattern" | "maxLength" | "children"
> & {
  maxLength: number;
  /** Allowed characters. `digits` also brings up the number keyboard. */
  pattern?: InputOTPPattern;
  /** Defaults to `upper` for letter patterns. */
  transform?: "upper" | "none";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once each time the value reaches `maxLength`. */
  onComplete?: (value: string) => void;
  /** Shows dots instead of characters (PINs). */
  mask?: boolean;
  size?: ControlSize;
  tone?: "default" | "success";
  /** Class for the root container. */
  className?: string;
  children: React.ReactNode;
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * One-time-code entry. A single real input holds the value (so SMS autofill,
 * paste and password managers work); the slots only draw it.
 */
export function InputOTP({
  maxLength,
  pattern = "digits",
  transform: transformProp,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onComplete,
  mask = false,
  size: sizeProp,
  tone = "default",
  className,
  children,
  id: idProp,
  disabled,
  required,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  onFocus,
  onBlur,
  onKeyDown,
  onPaste,
  onClick,
  ref,
  ...props
}: InputOTPProps) {
  const field = useOptionalField();
  const ownId = useId(idProp);
  const inputId = field?.id ?? ownId;
  const size = sizeProp ?? field?.size ?? "md";
  const transform = transformProp ?? (pattern === "alpha" || pattern === "alphanumeric" ? "upper" : "none");
  const invalid = Boolean(ariaInvalid && ariaInvalid !== "false") || Boolean(field?.invalid);
  const isDisabled = Boolean(disabled ?? field?.disabled);

  const setBoxless = field?.setBoxless;
  React.useLayoutEffect(() => {
    if (!setBoxless) return;
    setBoxless(true);
    return () => setBoxless(false);
  }, [setBoxless]);

  const [value, setValue] = useControllableState({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const setValueLength = field?.setValueLength;
  React.useEffect(() => {
    setValueLength?.(value.length);
  }, [setValueLength, value.length]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, inputRef);
  const [focused, setFocused] = React.useState(false);
  const [selStart, setSelStart] = React.useState(0);
  const pendingCaret = React.useRef<number | null>(null);

  /** Puts the caret at a slot; a filled slot is selected so typing replaces it. */
  const moveTo = React.useCallback(
    (index: number) => {
      const el = inputRef.current;
      if (!el) return;
      const len = el.value.length;
      const start = Math.max(0, Math.min(index, len, maxLength - 1));
      const end = start < len ? start + 1 : start;
      el.setSelectionRange(start, end);
      setSelStart(start);
    },
    [maxLength],
  );

  React.useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (inputRef.current?.ownerDocument.activeElement === inputRef.current) moveTo(caret);
  }, [value, moveTo]);

  const commit = (next: string, caret: number) => {
    const prev = valueRef.current;
    valueRef.current = next;
    pendingCaret.current = caret;
    setValue(next);
    if (next !== prev) setValueLength?.(next.length);
    if (next.length === maxLength && prev.length !== maxLength) onComplete?.(next);
  };

  const activeIndex = focused ? Math.min(selStart, maxLength - 1) : null;

  return (
    <OTPContext.Provider value={{ value, activeIndex, mask, invalid, size, tone }}>
      <div
        ref={rootRef}
        data-slot="input-otp"
        data-size={size}
        data-invalid={invalid ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        className={cn(
          "relative flex w-fit items-center gap-2 data-[disabled]:opacity-50",
          className,
        )}
      >
        {children}
        <input
          ref={composedRef}
          id={inputId}
          data-slot="input-otp-input"
          type="text"
          autoComplete="one-time-code"
          inputMode={pattern === "digits" ? "numeric" : "text"}
          autoCapitalize={transform === "upper" ? "characters" : "off"}
          spellCheck={false}
          maxLength={maxLength}
          disabled={isDisabled || undefined}
          required={required ?? (field?.required || undefined)}
          aria-invalid={invalid || undefined}
          aria-describedby={ariaDescribedBy ?? field?.describedBy}
          value={value}
          className={cn(
            "absolute inset-0 z-20 size-full cursor-text border-0 bg-transparent p-0 text-transparent caret-transparent opacity-0 outline-none [font-size:16px] selection:bg-transparent",
            "disabled:cursor-not-allowed",
          )}
          onChange={(e) => {
            const raw = e.target.value;
            const next = sanitizeOTP(raw, pattern, transform).slice(0, maxLength);
            const dropped = raw.length - next.length;
            const caret = Math.max(0, (e.target.selectionStart ?? next.length) - Math.max(0, dropped));
            commit(next, Math.min(caret, next.length));
          }}
          onPaste={(e) => {
            onPaste?.(e);
            if (e.defaultPrevented) return;
            e.preventDefault();
            const pasted = sanitizeOTP(e.clipboardData.getData("text"), pattern, transform);
            if (!pasted) return;
            const el = e.currentTarget;
            const current = valueRef.current;
            const start = Math.min(el.selectionStart ?? current.length, current.length);
            const next = (current.slice(0, start) + pasted + current.slice(start + pasted.length)).slice(
              0,
              maxLength,
            );
            commit(next, Math.min(start + pasted.length, next.length));
          }}
          onSelect={(e) => {
            const el = e.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? start;
            if (start === end && start < el.value.length) {
              moveTo(start);
              return;
            }
            setSelStart(start);
          }}
          onKeyDown={(e) => {
            onKeyDown?.(e);
            if (e.defaultPrevented) return;
            const el = e.currentTarget;
            const len = el.value.length;
            const current = Math.min(el.selectionStart ?? 0, maxLength - 1);
            switch (e.key) {
              case "ArrowLeft":
                e.preventDefault();
                moveTo(current - 1);
                break;
              case "ArrowRight":
                e.preventDefault();
                moveTo(current + 1);
                break;
              case "Home":
              case "ArrowUp":
                e.preventDefault();
                moveTo(0);
                break;
              case "End":
              case "ArrowDown":
                e.preventDefault();
                moveTo(len);
                break;
            }
          }}
          onClick={(e) => {
            onClick?.(e);
            const slots = rootRef.current?.querySelectorAll<HTMLElement>("[data-slot=input-otp-slot]");
            if (!slots?.length) return;
            let index = valueRef.current.length;
            for (const slot of slots) {
              const rect = slot.getBoundingClientRect();
              if (e.clientX >= rect.left && e.clientX <= rect.right) {
                index = Number(slot.dataset.index);
                break;
              }
            }
            moveTo(Math.min(index, valueRef.current.length));
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
            const target = Math.min(valueRef.current.length, maxLength - 1);
            moveTo(target);
            // Some browsers select all on focus after the event.
            requestAnimationFrame(() => {
              if (inputRef.current?.ownerDocument.activeElement === inputRef.current) {
                const el = inputRef.current!;
                if (el.selectionStart === 0 && el.selectionEnd === el.value.length && el.value.length > 1) {
                  moveTo(target);
                }
              }
            });
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </div>
    </OTPContext.Provider>
  );
}

export function InputOTPGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="input-otp-group" className={cn("flex items-center", className)} {...props} />;
}

const slotSize: Record<ControlSize, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-11 text-lg",
};

export type InputOTPSlotProps = React.HTMLAttributes<HTMLDivElement> & { index: number };

export function InputOTPSlot({ index, className, ...props }: InputOTPSlotProps) {
  const { value, activeIndex, mask, invalid, size, tone } = useOTP();
  const char = value[index];
  const active = activeIndex === index;
  return (
    <div
      aria-hidden
      data-slot="input-otp-slot"
      data-index={index}
      data-active={active ? "" : undefined}
      data-filled={char ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      className={cn(
        "relative flex items-center justify-center border-y border-r border-input bg-background font-medium tabular-nums shadow-xs",
        "transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
        "first:rounded-l-md first:border-l last:rounded-r-md dark:bg-input/30",
        slotSize[size],
        active && "z-10 border-ring ring-[3px] ring-ring/40",
        tone === "success" && "border-success text-success",
        invalid && "border-destructive text-destructive",
        invalid && active && "ring-destructive/30",
        className,
      )}
      {...props}
    >
      {char ? (
        <span key={char} className="animate-[apolyx-otp-char_80ms_ease-out] motion-reduce:animate-none">
          {mask ? "•" : char}
        </span>
      ) : null}
      {active && !char ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="h-[1.1em] w-px bg-foreground animate-[apolyx-caret-blink_1s_step-end_infinite] motion-reduce:animate-none" />
        </span>
      ) : null}
    </div>
  );
}

export function InputOTPSeparator({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      data-slot="input-otp-separator"
      className={cn("flex items-center text-muted-foreground", className)}
      {...props}
    >
      {children ?? <span className="block h-0.5 w-2.5 rounded-full bg-muted-foreground/40" />}
    </div>
  );
}
