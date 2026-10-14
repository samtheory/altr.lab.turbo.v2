"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";

export type FieldLayout = "top" | "floating" | "inline";

type FieldContextValue = {
  id: string;
  layout: FieldLayout;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  multiline: boolean;
  setMultiline: (multiline: boolean) => void;
  setFilled: (filled: boolean) => void;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("FieldInput / FieldTextarea must be used within Field");
  return ctx;
}

export type FieldProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  label: React.ReactNode;
  /**
   * `top` — label above the box.
   * `floating` — label rests inside and shrinks onto the top border when focused or filled.
   * `inline` — label and control side by side in one box, label on a muted panel.
   */
  layout?: FieldLayout;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Id for the control. Generated when omitted. */
  id?: string;
  /** Width of the label panel in `inline` layout (any CSS length). */
  labelWidth?: string;
  /** Extra classes for the bordered control box. */
  controlClassName?: string;
  children: React.ReactNode;
};

export function Field({
  label,
  layout = "top",
  description,
  error,
  required = false,
  disabled = false,
  id: idProp,
  labelWidth,
  className,
  controlClassName,
  children,
  ...props
}: FieldProps) {
  const id = useId(idProp);
  const descriptionId = useId();
  const errorId = useId();
  const [filled, setFilled] = React.useState(false);
  const [multiline, setMultiline] = React.useState(false);
  const invalid = Boolean(error);
  const describedBy =
    [description ? descriptionId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const labelNode = (
    <label
      htmlFor={id}
      data-slot="field-label"
      className={cn(
        "select-none text-sm font-medium transition-[color,background-color,translate,scale,top] duration-(--duration-base) ease-(--ease-out)",
        layout === "top" &&
          "text-foreground group-focus-within/field:text-primary group-data-[invalid]/field:text-destructive",
        layout === "floating" && [
          "pointer-events-none absolute left-2.5 z-10 origin-left -translate-y-1/2 rounded-sm bg-inherit px-1 font-normal text-muted-foreground",
          multiline ? "top-5" : "top-1/2",
          "group-focus-within/control:top-0 group-focus-within/control:scale-[0.82] group-focus-within/control:font-medium group-focus-within/control:text-primary",
          "group-data-[filled]/control:top-0 group-data-[filled]/control:scale-[0.82] group-data-[filled]/control:font-medium",
          "group-data-[invalid]/control:text-destructive",
        ],
        layout === "inline" && [
          "flex shrink-0 items-center self-stretch border-r border-input bg-muted px-3 text-muted-foreground",
          "group-hover/control:border-border-strong group-focus-within/control:border-ring group-focus-within/control:bg-accent group-focus-within/control:text-foreground",
          "group-data-[invalid]/control:border-destructive group-data-[invalid]/control:text-destructive",
          multiline && "items-start pt-2.5",
        ],
      )}
      style={layout === "inline" && labelWidth ? { width: labelWidth } : undefined}
    >
      {label}
      {required ? (
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      ) : null}
    </label>
  );

  return (
    <FieldContext.Provider
      value={{
        id,
        layout,
        describedBy,
        invalid,
        disabled,
        required,
        multiline,
        setMultiline,
        setFilled,
      }}
    >
      <div
        data-slot="field"
        data-layout={layout}
        data-invalid={invalid ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        className={cn("group/field flex w-full flex-col gap-1.5", className)}
        {...props}
      >
        {layout === "top" ? labelNode : null}
        <div
          data-slot="field-control"
          data-filled={filled ? "" : undefined}
          data-invalid={invalid ? "" : undefined}
          className={cn(
            "group/control relative flex w-full items-stretch rounded-md border border-input bg-background shadow-sm",
            "transition-[border-color,box-shadow,background-color] duration-(--duration-slow) ease-(--ease-out) focus-within:duration-(--duration-base)",
            "hover:border-border-strong",
            "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20",
            "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-(--duration-slow) after:ease-(--ease-out) focus-within:after:scale-x-100",
            "data-[invalid]:border-destructive data-[invalid]:focus-within:ring-destructive/25 data-[invalid]:after:bg-destructive",
            layout === "inline" && "overflow-hidden",
            disabled && "pointer-events-none opacity-50",
            controlClassName,
          )}
        >
          {layout !== "top" ? labelNode : null}
          {children}
        </div>
        {description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
        {invalid ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>
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

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn(
        "text-xs font-medium text-destructive motion-safe:animate-[apolyx-field-error_var(--duration-base)_var(--ease-out)]",
        className,
      )}
      {...props}
    />
  );
}

function isFilled(value: unknown) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).length > 0;
}

function useFilledSync(
  value: unknown,
  defaultValue: unknown,
  setFilled: (filled: boolean) => void,
) {
  const controlled = value !== undefined;
  React.useEffect(() => {
    if (controlled) setFilled(isFilled(value));
  }, [controlled, value, setFilled]);
  React.useEffect(() => {
    if (!controlled) setFilled(isFilled(defaultValue));
    // Only the initial uncontrolled value matters; later edits report via onChange.
  }, []);
}

const controlBase =
  "w-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";

export type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
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
  useFilledSync(props.value, props.defaultValue, field.setFilled);
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
        field.layout === "floating" ? "h-11 pt-1" : "h-10",
        field.layout === "floating" &&
          "placeholder:text-transparent focus:placeholder:text-muted-foreground placeholder:transition-colors",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field.setFilled(e.target.value.length > 0);
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
  useFilledSync(props.value, props.defaultValue, field.setFilled);
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
        "min-h-24 resize-y py-2.5",
        field.layout === "floating" &&
          "pt-4 placeholder:text-transparent focus:placeholder:text-muted-foreground",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field.setFilled(e.target.value.length > 0);
      }}
      {...props}
    />
  );
}
