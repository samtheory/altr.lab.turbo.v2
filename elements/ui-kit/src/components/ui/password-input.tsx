"use client";

import * as React from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";
import { easings } from "../../motion/tokens";
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
import { Label } from "./label";

export type PasswordInputProps = Omit<InputGroupInputProps, "type"> & {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  size?: ControlSize;
  variant?: ControlVariant;
  shape?: ControlShape;
  /** Extra addons (e.g. a lock icon) rendered in the same box. */
  children?: React.ReactNode;
};

/**
 * Password field with a show / hide toggle. Standalone it draws its own box;
 * inside a `Field` it uses the Field's box. `className` goes on the box when
 * standalone, on the input inside a Field.
 */
export function PasswordInput({
  visible: visibleProp,
  defaultVisible = false,
  onVisibleChange,
  size,
  variant,
  shape,
  className,
  children,
  id: idProp,
  ref,
  disabled,
  ...props
}: PasswordInputProps) {
  const field = useOptionalField();
  const ownId = useId(idProp);
  const inputId = field?.id ?? ownId;
  const [visible, setVisible] = useControllableState({
    value: visibleProp,
    defaultValue: defaultVisible,
    onChange: onVisibleChange,
  });
  const inputRef = React.useRef<HTMLInputElement>(null);
  const composedRef = useComposedRefs(ref, inputRef);
  const selection = React.useRef<[number | null, number | null] | null>(null);

  React.useLayoutEffect(() => {
    const el = inputRef.current;
    const saved = selection.current;
    selection.current = null;
    if (!el || !saved) return;
    el.setSelectionRange(saved[0], saved[1]);
  }, [visible]);

  const toggle = () => {
    const el = inputRef.current;
    if (el && el.ownerDocument.activeElement === el) {
      selection.current = [el.selectionStart, el.selectionEnd];
    }
    setVisible(!visible);
  };

  const isDisabled = disabled ?? field?.disabled;

  const content = (
    <>
      {children}
      <InputGroupInput
        ref={composedRef}
        id={inputId}
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        spellCheck={false}
        autoCapitalize="off"
        disabled={isDisabled || undefined}
        className={field ? className : undefined}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label="Show password"
          aria-pressed={visible}
          aria-controls={inputId}
          disabled={isDisabled || undefined}
          data-slot="password-toggle"
          // Keeps focus (and the caret) in the input when it already has it.
          onPointerDown={(e) => {
            if (e.currentTarget.ownerDocument.activeElement === inputRef.current) e.preventDefault();
          }}
          onClick={toggle}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </>
  );

  if (field) return content;
  return (
    <InputGroup size={size} variant={variant} shape={shape} className={className}>
      {content}
    </InputGroup>
  );
}

export type PasswordRule = {
  id: string;
  label: string;
  test: (value: string) => boolean;
};

export const defaultPasswordRules: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "case", label: "Upper and lower case letters", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { id: "number", label: "A number", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "A symbol", test: (v) => /[^A-Za-z0-9\s]/.test(v) },
];

export type PasswordStrengthLevel = "empty" | "weak" | "fair" | "good" | "strong";

const levelLabels: Record<Exclude<PasswordStrengthLevel, "empty">, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

export function getPasswordStrength(score: number, max: number, empty = false): PasswordStrengthLevel {
  if (empty || max <= 0) return "empty";
  const ratio = score / max;
  if (ratio <= 0.25) return "weak";
  if (ratio <= 0.5) return "fair";
  if (ratio < 1) return "good";
  return "strong";
}

const levelTone: Record<PasswordStrengthLevel, string> = {
  empty: "bg-muted-foreground/30",
  weak: "bg-destructive",
  fair: "bg-warning",
  good: "bg-warning",
  strong: "bg-success",
};

const levelText: Record<PasswordStrengthLevel, string> = {
  empty: "text-muted-foreground",
  weak: "text-destructive",
  fair: "text-warning",
  good: "text-warning",
  strong: "text-success",
};

export type PasswordStrengthProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  value: string;
  rules?: PasswordRule[];
  variant?: "bar" | "checklist" | "both";
  /** Overrides the rule count, e.g. from your own estimator. */
  score?: number;
  /** Highest score when `score` is supplied. Defaults to the rule count. */
  max?: number;
  /** Labels for weak / fair / good / strong. */
  labels?: Partial<typeof levelLabels>;
};

/** Segmented meter and/or rule checklist for a password. Announces the level when it changes. */
export function PasswordStrength({
  value,
  rules = defaultPasswordRules,
  variant = "bar",
  score: scoreProp,
  max: maxProp,
  labels,
  className,
  ...props
}: PasswordStrengthProps) {
  const reduce = useReducedMotion();
  const results = rules.map((rule) => ({ rule, met: value.length > 0 && rule.test(value) }));
  const max = maxProp ?? rules.length;
  const score = scoreProp ?? results.filter((r) => r.met).length;
  const level = getPasswordStrength(score, max, value.length === 0);
  const label = level === "empty" ? "" : (labels?.[level] ?? levelLabels[level]);
  const showBar = variant !== "checklist";
  const showList = variant !== "bar";

  return (
    <div
      data-slot="password-strength"
      data-level={level}
      className={cn("grid gap-2 text-xs", className)}
      {...props}
    >
      {showBar ? (
        <div className="grid gap-1.5">
          <div
            role="meter"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={Math.min(score, max)}
            aria-valuetext={label || "Empty"}
            className="flex gap-1"
          >
            {Array.from({ length: max }, (_, i) => (
              <motion.span
                key={i}
                data-filled={i < score ? "" : undefined}
                initial={false}
                animate={
                  reduce
                    ? undefined
                    : i < score
                      ? { scaleY: [0.6, 1.15, 1], opacity: 1 }
                      : { scaleY: 1, opacity: 1 }
                }
                transition={{ duration: 0.28, ease: easings.out, delay: i * 0.03 }}
                className={cn(
                  "h-1 flex-1 origin-center rounded-full bg-muted transition-colors duration-200 motion-reduce:transition-none",
                  i < score && levelTone[level],
                )}
              />
            ))}
          </div>
          <p aria-live="polite" className={cn("min-h-4 font-medium", levelText[level])}>
            {label}
          </p>
        </div>
      ) : (
        <p aria-live="polite" className="sr-only">
          {label ? `Password strength: ${label}` : ""}
        </p>
      )}
      {showList ? (
        <ul className="grid gap-1" aria-label="Password requirements">
          {results.map(({ rule, met }) => (
            <li
              key={rule.id}
              data-met={met ? "" : undefined}
              className="flex items-center gap-2 text-muted-foreground transition-colors duration-200 data-[met]:text-foreground motion-reduce:transition-none"
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-4 place-items-center rounded-full transition-[background-color,transform] duration-200 motion-reduce:transition-none",
                  met ? "scale-100 bg-success text-success-foreground" : "scale-90 bg-muted",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={met ? "met" : "open"}
                    initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={reduce ? undefined : { scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.18, ease: easings.out }}
                    className="grid place-items-center"
                  >
                    {met ? <Check className="size-3" /> : <X className="size-2.5" />}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="sr-only">{met ? "Met:" : "Not met:"}</span>
              {rule.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type PasswordRulesProps = Omit<PasswordInputProps, "children" | "onChange"> & {
  label?: React.ReactNode;
  rules?: PasswordRule[];
  strengthVariant?: PasswordStrengthProps["variant"];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string, score: number) => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

/**
 * Password field with show/hide plus an animated strength meter and requirement checklist.
 * Prefer composing `PasswordInput` + `PasswordStrength` when you need a custom Field layout.
 */
export function PasswordRules({
  label = "Password",
  rules = defaultPasswordRules,
  strengthVariant = "both",
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onChange,
  id: idProp,
  className,
  ...props
}: PasswordRulesProps) {
  const id = useId(idProp);
  const [inner, setInner] = React.useState(defaultValue);
  const value = valueProp ?? inner;
  const score = rules.filter((r) => value.length > 0 && r.test(value)).length;

  return (
    <div data-slot="password-rules" className={cn("grid w-full max-w-xs gap-2", className)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <PasswordInput
        id={id}
        autoComplete="new-password"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (valueProp === undefined) setInner(next);
          onChange?.(e);
          onValueChange?.(next, rules.filter((r) => next.length > 0 && r.test(next)).length);
        }}
        {...props}
      />
      <PasswordStrength value={value} rules={rules} variant={strengthVariant} score={score} />
    </div>
  );
}
