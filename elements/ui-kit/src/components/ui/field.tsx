"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";
import {
  ControlBox,
  controlHeight,
  controlText,
  type ControlShape,
  type ControlSize,
  type ControlVariant,
} from "./control-box";

export type FieldLayout = "top" | "floating" | "inline";
export type FieldOrientation = "vertical" | "horizontal";

type FieldContextValue = {
  id: string;
  layout: FieldLayout;
  size: ControlSize;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  multiline: boolean;
  valueLength: number;
  setMultiline: (multiline: boolean) => void;
  setValueLength: (length: number) => void;
  setOverLimit: (over: boolean) => void;
  /** Lets a control (e.g. InputOTP) draw its own boxes instead of the Field box. */
  setBoxless: (boxless: boolean) => void;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("FieldInput / FieldTextarea must be used within Field");
  return ctx;
}

/** Field context when inside a Field, otherwise `null`. */
export function useOptionalField() {
  return React.useContext(FieldContext);
}

export type FieldProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  label: React.ReactNode;
  /**
   * `top` — label above the box.
   * `floating` — label rests inside and shrinks onto the top border when focused or filled.
   * `inline` — label and control side by side in one box, label on a muted panel.
   */
  layout?: FieldLayout;
  /** `horizontal` puts label and description in a left column; collapses on narrow containers. */
  orientation?: FieldOrientation;
  description?: React.ReactNode;
  /** One message, or several rendered as a list. */
  error?: React.ReactNode | React.ReactNode[];
  /** End of the label row (top layout and horizontal): a link, info tooltip, or badge. */
  labelAside?: React.ReactNode;
  required?: boolean;
  /** Shows a muted "(optional)". `required` wins if both are set. */
  optional?: boolean;
  disabled?: boolean;
  size?: ControlSize;
  variant?: ControlVariant;
  shape?: ControlShape;
  /** Id for the control. Generated when omitted. */
  id?: string;
  /** Width of the label panel in `inline` layout, or the label column in `horizontal`. */
  labelWidth?: string;
  /** Extra classes for the bordered control box. */
  controlClassName?: string;
  children: React.ReactNode;
};

function hasError(error: FieldProps["error"]) {
  if (Array.isArray(error)) return error.length > 0;
  return Boolean(error);
}

export function Field({
  label,
  layout = "top",
  orientation = "vertical",
  description,
  error,
  labelAside,
  required = false,
  optional = false,
  disabled = false,
  size = "md",
  variant,
  shape,
  id: idProp,
  labelWidth,
  className,
  controlClassName,
  style,
  children,
  ...props
}: FieldProps) {
  const id = useId(idProp);
  const descriptionId = useId();
  const errorId = useId();
  const [valueLength, setValueLength] = React.useState(0);
  const [multiline, setMultiline] = React.useState(false);
  const [overLimit, setOverLimit] = React.useState(false);
  const [boxless, setBoxless] = React.useState(false);
  const filled = valueLength > 0;
  const horizontal = orientation === "horizontal";
  // Horizontal rows keep the label outside the box.
  const effectiveLayout: FieldLayout = horizontal ? "top" : layout;
  const invalid = hasError(error) || overLimit;
  const describedBy =
    [description ? descriptionId : null, hasError(error) ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const labelNode = (
    <label
      htmlFor={id}
      data-slot="field-label"
      className={cn(
        "select-none text-sm font-medium transition-[color,background-color,translate,scale,top,left] duration-(--duration-base) ease-(--ease-out)",
        effectiveLayout === "top" &&
          "text-foreground group-focus-within/field:text-primary group-data-[invalid]/field:text-destructive",
        effectiveLayout === "floating" && [
          "pointer-events-none absolute left-(--field-label-left,0.625rem) z-10 origin-left -translate-y-1/2 rounded-sm bg-inherit px-1 font-normal text-muted-foreground",
          multiline ? "top-5" : "top-1/2",
          "group-focus-within/control:top-0 group-focus-within/control:scale-[0.82] group-focus-within/control:font-medium group-focus-within/control:text-primary",
          "group-data-[filled]/control:top-0 group-data-[filled]/control:scale-[0.82] group-data-[filled]/control:font-medium",
          "group-data-[invalid]/control:text-destructive",
        ],
        effectiveLayout === "inline" && [
          "flex shrink-0 items-center self-stretch border-r border-input bg-muted px-3 text-muted-foreground",
          "group-hover/control:border-border-strong group-focus-within/control:border-ring group-focus-within/control:bg-accent group-focus-within/control:text-foreground",
          "group-data-[invalid]/control:border-destructive group-data-[invalid]/control:text-destructive",
          multiline && "items-start pt-2.5",
        ],
      )}
      style={effectiveLayout === "inline" && labelWidth ? { width: labelWidth } : undefined}
    >
      {label}
      {required ? (
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      ) : optional ? (
        <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
      ) : null}
    </label>
  );

  const labelRow =
    effectiveLayout === "top" ? (
      labelAside ? (
        <div className="flex items-center justify-between gap-2">
          {labelNode}
          <span data-slot="field-label-aside" className="text-xs">
            {labelAside}
          </span>
        </div>
      ) : (
        labelNode
      )
    ) : null;

  const descriptionNode = description ? (
    <FieldDescription id={descriptionId}>{description}</FieldDescription>
  ) : null;

  const control = boxless ? (
    <div data-slot="field-control" className={controlClassName}>
      {children}
    </div>
  ) : (
    <ControlBox
      data-slot="field-control"
      size={size}
      variant={variant}
      shape={shape}
      data-filled={filled ? "" : undefined}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        effectiveLayout === "inline" && "overflow-hidden",
        // A resting floating label sits after an inline-start addon; it returns to the edge when raised.
        effectiveLayout === "floating" &&
          "[&:has([data-align=inline-start]):not(:focus-within):not([data-filled])]:[--field-label-left:calc(var(--addon-start-width,2.25rem)+0.25rem)]",
        controlClassName,
      )}
    >
      {effectiveLayout !== "top" ? labelNode : null}
      {children}
    </ControlBox>
  );

  const errorNode = hasError(error) ? <FieldError id={errorId}>{error}</FieldError> : null;

  return (
    <FieldContext.Provider
      value={{
        id,
        layout: effectiveLayout,
        size,
        describedBy,
        invalid,
        disabled,
        required,
        multiline,
        valueLength,
        setMultiline,
        setValueLength,
        setOverLimit,
        setBoxless,
      }}
    >
      {horizontal ? (
        <div
          data-slot="field"
          data-orientation="horizontal"
          data-invalid={invalid ? "" : undefined}
          data-disabled={disabled ? "" : undefined}
          className={cn("group/field @container w-full", className)}
          style={{ ["--field-label-width" as string]: labelWidth ?? "12rem", ...style }}
          {...props}
        >
          <div className="grid gap-1.5 @md:grid-cols-[var(--field-label-width)_minmax(0,1fr)] @md:gap-x-6">
            <div className="grid content-start gap-1 @md:pt-2">
              {labelRow}
              {descriptionNode}
            </div>
            <div className="grid content-start gap-1.5">
              {control}
              {errorNode}
            </div>
          </div>
        </div>
      ) : (
        <div
          data-slot="field"
          data-layout={layout}
          data-invalid={invalid ? "" : undefined}
          data-disabled={disabled ? "" : undefined}
          className={cn("group/field flex w-full flex-col gap-1.5", className)}
          style={style}
          {...props}
        >
          {labelRow}
          {control}
          {descriptionNode}
          {errorNode}
        </div>
      )}
    </FieldContext.Provider>
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

export type FieldErrorProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children?: React.ReactNode | React.ReactNode[];
};

/** One alert region; an array renders as a list of messages. */
export function FieldError({ className, children, ...props }: FieldErrorProps) {
  const base =
    "text-xs font-medium text-destructive motion-safe:animate-[apolyx-field-error_var(--duration-base)_var(--ease-out)]";
  if (Array.isArray(children)) {
    return (
      <div data-slot="field-error" role="alert" className={cn(base, className)} {...props}>
        <ul className="grid gap-1">
          {children.map((message, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <CircleAlert aria-hidden className="mt-px size-3 shrink-0" />
              <span>{message}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <p data-slot="field-error" role="alert" className={cn(base, className)} {...props}>
      {children}
    </p>
  );
}

export type FieldCounterProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  max: number;
};

/**
 * Character count for the Field's control, rendered inside the box. Turns warning at
 * 90% of `max` and destructive past it, which also marks the Field invalid.
 */
export function FieldCounter({ max, className, ...props }: FieldCounterProps) {
  const { valueLength, setOverLimit, multiline } = useField();
  const over = valueLength > max;
  const near = valueLength >= max * 0.9;
  React.useEffect(() => {
    setOverLimit(over);
  }, [over, setOverLimit]);
  React.useEffect(() => () => setOverLimit(false), [setOverLimit]);
  return (
    <span
      data-slot="field-counter"
      data-state={over ? "over" : near ? "near" : "ok"}
      aria-live={near ? "polite" : "off"}
      className={cn(
        "flex shrink-0 select-none items-center pr-3 pl-1 text-xs tabular-nums text-muted-foreground transition-colors duration-(--duration-fast)",
        multiline && "items-end pb-2",
        "data-[state=near]:text-warning data-[state=over]:font-medium data-[state=over]:text-destructive",
        className,
      )}
      {...props}
    >
      {valueLength} / {max}
    </span>
  );
}

function valueLengthOf(value: unknown) {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  return String(value).length;
}

/** Reports a control's value length to the Field (drives `filled` and `FieldCounter`). */
export function useFieldValueSync(
  value: unknown,
  defaultValue: unknown,
  setValueLength: ((length: number) => void) | undefined,
) {
  const controlled = value !== undefined;
  React.useEffect(() => {
    if (controlled) setValueLength?.(valueLengthOf(value));
  }, [controlled, value, setValueLength]);
  React.useEffect(() => {
    if (!controlled) setValueLength?.(valueLengthOf(defaultValue));
    // Only the initial uncontrolled value matters; later edits report via onChange.
  }, []);
}

const controlBase =
  "w-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";

export type FieldInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  ref?: React.Ref<HTMLInputElement>;
};

export function FieldInput({
  className,
  onChange,
  placeholder,
  ref,
  ...props
}: FieldInputProps) {
  const field = useField();
  useFieldValueSync(props.value, props.defaultValue, field.setValueLength);
  return (
    <input
      ref={ref}
      id={field.id}
      data-slot="field-input"
      aria-describedby={field.describedBy}
      aria-invalid={field.invalid || undefined}
      required={field.required || undefined}
      disabled={field.disabled || undefined}
      placeholder={placeholder}
      className={cn(
        controlBase,
        controlText,
        field.layout === "floating"
          ? "h-11 pt-1 group-data-[size=sm]/control:h-10 group-data-[size=lg]/control:h-12"
          : controlHeight,
        field.layout === "floating" &&
          "placeholder:text-transparent focus:placeholder:text-muted-foreground placeholder:transition-colors",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field.setValueLength(e.target.value.length);
      }}
      {...props}
    />
  );
}

export type FieldTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    ref?: React.Ref<HTMLTextAreaElement>;
  };

export function FieldTextarea({
  className,
  onChange,
  ref,
  ...props
}: FieldTextareaProps) {
  const field = useField();
  const { setMultiline } = field;
  useFieldValueSync(props.value, props.defaultValue, field.setValueLength);
  React.useEffect(() => {
    setMultiline(true);
    return () => setMultiline(false);
  }, [setMultiline]);
  return (
    <textarea
      ref={ref}
      id={field.id}
      data-slot="field-textarea"
      aria-describedby={field.describedBy}
      aria-invalid={field.invalid || undefined}
      required={field.required || undefined}
      disabled={field.disabled || undefined}
      className={cn(
        controlBase,
        controlText,
        "min-h-24 resize-y py-2.5",
        field.layout === "floating" &&
          "pt-4 placeholder:text-transparent focus:placeholder:text-muted-foreground",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field.setValueLength(e.target.value.length);
      }}
      {...props}
    />
  );
}
