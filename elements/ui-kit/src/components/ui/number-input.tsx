"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";

import { cn } from "../../lib/utils";
import { useComposedRefs } from "../../primitives/compose-refs";
import { useControllableState } from "../../primitives/use-controllable-state";
import { useId } from "../../primitives/use-id";
import type { ControlShape, ControlSize, ControlVariant } from "./control-box";
import { useOptionalField } from "./field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  type InputGroupInputProps,
} from "./input-group";

const HOLD_DELAY = 400;
const HOLD_INTERVAL = 60;

function decimalsOf(n: number) {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  if (s.includes("e-")) return Number(s.split("e-")[1]);
  return s.split(".")[1]?.length ?? 0;
}

export function clampNumber(n: number, min?: number, max?: number) {
  let out = n;
  if (min !== undefined && out < min) out = min;
  if (max !== undefined && out > max) out = max;
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses user text with the locale's group and decimal separators. Ignores
 * currency symbols, percent signs, units and spaces. Returns `null` for empty
 * text and `NaN` for text that is not a number.
 */
export function parseLocaleNumber(text: string, locale?: string, options?: Intl.NumberFormatOptions) {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  const negative = /^\s*[-−(]/.test(trimmed) || /-\s*$/.test(trimmed);
  let normalized = trimmed
    .replace(new RegExp(escapeRegExp(group), "g"), "")
    .replace(/[\s\u00a0\u202f]/g, "");
  if (decimal !== ".") normalized = normalized.replace(new RegExp(escapeRegExp(decimal), "g"), ".");
  normalized = normalized.replace(/[^\d.]/g, "");
  if (normalized === "" || normalized === "." || (normalized.match(/\./g)?.length ?? 0) > 1) return Number.NaN;
  let n = Number(normalized);
  if (negative) n = -n;
  if (options?.style === "percent") n = n / 100;
  return n;
}

export type NumberInputProps = Omit<
  InputGroupInputProps,
  "value" | "defaultValue" | "onChange" | "type" | "min" | "max" | "step" | "children"
> & {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Step for Shift+Arrow and PageUp / PageDown. Defaults to `step × 10`. */
  largeStep?: number;
  /** `Intl.NumberFormat` options used while the input is not focused. */
  format?: Intl.NumberFormatOptions;
  locale?: string;
  /** `split` puts − / + on each side, `stacked` puts chevrons on the end, `none` hides them. */
  layout?: "split" | "stacked" | "none";
  /** Mouse wheel changes the value while focused. */
  allowWheel?: boolean;
  size?: ControlSize;
  variant?: ControlVariant;
  shape?: ControlShape;
  /** Extra addons (units, icons) rendered in the same box. */
  children?: React.ReactNode;
};

/**
 * Number field with steppers, keyboard stepping, hold-to-repeat, clamping and
 * `Intl` formatting. The value is `number | null`; a hidden input carries it
 * for forms under `name`.
 */
export function NumberInput({
  value: valueProp,
  defaultValue = null,
  onValueChange,
  min,
  max,
  step = 1,
  largeStep,
  format,
  locale,
  layout = "split",
  allowWheel = false,
  size,
  variant,
  shape,
  className,
  children,
  name,
  disabled,
  readOnly,
  onFocus,
  onBlur,
  onKeyDown,
  id: idProp,
  ref,
  ...props
}: NumberInputProps) {
  const field = useOptionalField();
  const ownId = useId(idProp);
  const inputId = field?.id ?? ownId;
  const [value, setValue] = useControllableState<number | null>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const valueRef = React.useRef(value);
  valueRef.current = value;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const composedRef = useComposedRefs(ref, inputRef);
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const formatKey = JSON.stringify(format ?? null);
  const formatter = React.useMemo(
    () => new Intl.NumberFormat(locale, format),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, formatKey],
  );
  const scale = format?.style === "percent" ? 100 : 1;
  const editFormatter = React.useMemo(
    () => new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }),
    [locale],
  );
  const toEditText = React.useCallback(
    (n: number | null) => (n == null ? "" : editFormatter.format(Number((n * scale).toPrecision(12)))),
    [editFormatter, scale],
  );
  const parse = (text: string) => parseLocaleNumber(text, locale, format);

  const isDisabled = Boolean(disabled ?? field?.disabled);
  const locked = isDisabled || Boolean(readOnly);
  const formatted = value == null ? "" : formatter.format(value);

  const commit = React.useCallback(
    (next: number | null) => {
      valueRef.current = next;
      setValue(next);
    },
    [setValue],
  );

  const stepBy = React.useCallback(
    (delta: number) => {
      const current = valueRef.current;
      const base = current ?? 0;
      const decimals = Math.max(decimalsOf(step), decimalsOf(base), decimalsOf(delta));
      const next = clampNumber(Number((base + delta).toFixed(decimals)), min, max);
      if (next === current) return false;
      commit(next);
      if (inputRef.current?.ownerDocument.activeElement === inputRef.current) setDraft(toEditText(next));
      return true;
    },
    [commit, max, min, step, toEditText],
  );

  const big = largeStep ?? step * 10;

  // Hold-to-repeat on the stepper buttons.
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopHold = React.useCallback(() => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);
  React.useEffect(() => stopHold, [stopHold]);

  const startHold = (delta: number) => {
    stopHold();
    if (!stepBy(delta)) return;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = setInterval(() => {
        if (!stepBy(delta)) stopHold();
      }, HOLD_INTERVAL);
    }, HOLD_DELAY);
  };

  React.useEffect(() => {
    const el = inputRef.current;
    if (!allowWheel || !el || locked) return;
    const onWheel = (e: WheelEvent) => {
      if (el.ownerDocument.activeElement !== el || e.deltaY === 0) return;
      e.preventDefault();
      stepBy(e.deltaY < 0 ? step : -step);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [allowWheel, locked, step, stepBy]);

  const finishEditing = () => {
    const parsed = parse(draft);
    if (parsed === null) {
      commit(null);
      return null;
    }
    if (Number.isNaN(parsed)) return valueRef.current;
    const clamped = clampNumber(parsed, min, max);
    if (clamped !== valueRef.current) commit(clamped);
    return clamped;
  };

  const atMin = value != null && min !== undefined && value <= min;
  const atMax = value != null && max !== undefined && value >= max;

  const stepperProps = (delta: number) => ({
    tabIndex: -1,
    disabled: locked || (delta < 0 ? atMin : atMax) || undefined,
    "aria-controls": inputId,
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button > 0) return;
      e.preventDefault();
      startHold(delta);
    },
    onPointerUp: stopHold,
    onPointerLeave: stopHold,
    onPointerCancel: stopHold,
    // Keyboard and assistive-tech clicks (no pointer down).
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 0) stepBy(delta);
    },
  });

  const content = (
    <>
      {layout === "split" ? (
        <InputGroupAddon>
          <InputGroupButton size="icon-xs" aria-label="Decrease" {...stepperProps(-step)}>
            <Minus />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
      {children}
      <InputGroupInput
        ref={composedRef}
        id={inputId}
        role="spinbutton"
        inputMode="decimal"
        autoComplete="off"
        aria-valuenow={value ?? undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={formatted || undefined}
        disabled={isDisabled || undefined}
        readOnly={readOnly}
        value={focused ? draft : formatted}
        className={cn("tabular-nums", layout === "split" && "text-center", field ? className : undefined)}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const parsed = parse(text);
          if (parsed === null) commit(null);
          else if (!Number.isNaN(parsed)) commit(parsed);
        }}
        onFocus={(e) => {
          setDraft(toEditText(valueRef.current));
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          finishEditing();
          setFocused(false);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented || locked) return;
          let handled = true;
          switch (e.key) {
            case "ArrowUp":
              stepBy(e.shiftKey ? big : step);
              break;
            case "ArrowDown":
              stepBy(e.shiftKey ? -big : -step);
              break;
            case "PageUp":
              stepBy(big);
              break;
            case "PageDown":
              stepBy(-big);
              break;
            case "Home":
              if (min === undefined) handled = false;
              else stepBy(min - (valueRef.current ?? 0));
              break;
            case "End":
              if (max === undefined) handled = false;
              else stepBy(max - (valueRef.current ?? 0));
              break;
            case "Enter": {
              const next = finishEditing();
              setDraft(toEditText(next));
              handled = false;
              break;
            }
            default:
              handled = false;
          }
          if (handled) e.preventDefault();
        }}
        {...props}
      />
      {name ? <input type="hidden" name={name} value={value ?? ""} disabled={isDisabled} /> : null}
      {layout === "split" ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Increase" {...stepperProps(step)}>
            <Plus />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
      {layout === "stacked" ? (
        <InputGroupAddon align="inline-end" className="self-stretch py-0 pr-0 has-[>button]:pr-0">
          <span className="flex h-full flex-col border-l border-input">
            {[step, -step].map((delta) => (
              <button
                key={delta}
                type="button"
                aria-label={delta > 0 ? "Increase" : "Decrease"}
                className={cn(
                  "flex flex-1 items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
                  delta < 0 && "border-t border-input",
                )}
                {...stepperProps(delta)}
              >
                {delta > 0 ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            ))}
          </span>
        </InputGroupAddon>
      ) : null}
    </>
  );

  if (field) return content;
  return (
    <InputGroup size={size} variant={variant} shape={shape} className={cn("overflow-hidden", className)}>
      {content}
    </InputGroup>
  );
}
