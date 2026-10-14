"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { useComposedRefs } from "../../primitives/compose-refs";
import { useId } from "../../primitives/use-id";
import { Button, type ButtonProps } from "./button";
import {
  ControlBox,
  controlHeight,
  controlText,
  type ControlBoxProps,
} from "./control-box";
import { useFieldValueSync, useOptionalField } from "./field";

export type InputGroupProps = ControlBoxProps;

const InputGroupContext = React.createContext(false);

/** True inside an `InputGroup`; controls render borderless there. */
export function useInInputGroup() {
  return React.useContext(InputGroupContext);
}

/** One bordered box holding a control plus addons (icons, text, buttons, toolbars). */
export function InputGroup({ className, ...props }: InputGroupProps) {
  return (
    <InputGroupContext.Provider value={true}>
      <ControlBox
        role="group"
        data-slot="input-group"
        className={cn("flex-wrap", className)}
        {...props}
      />
    </InputGroupContext.Provider>
  );
}

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";

export type InputGroupAddonProps = React.HTMLAttributes<HTMLDivElement> & {
  align?: InputGroupAddonAlign;
  /** Draws a separator between a block addon and the control. */
  divided?: boolean;
  ref?: React.Ref<HTMLDivElement>;
};

function isDev() {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;
  return env?.NODE_ENV !== "production";
}

const INTERACTIVE = "button, a, input, select, textarea, [role=button], [role=menuitem], [tabindex]";

export function InputGroupAddon({
  align = "inline-start",
  divided = false,
  className,
  onClick,
  ref,
  ...props
}: InputGroupAddonProps) {
  const localRef = React.useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, localRef);
  const block = align === "block-start" || align === "block-end";

  // Lets a floating Field label rest after the addon.
  React.useLayoutEffect(() => {
    const el = localRef.current;
    if (align !== "inline-start" || !el || typeof ResizeObserver === "undefined") return;
    const box = el.closest<HTMLElement>("[data-slot=field-control], [data-slot=input-group]");
    if (!box) return;
    const ro = new ResizeObserver(() =>
      box.style.setProperty("--addon-start-width", `${el.offsetWidth}px`),
    );
    ro.observe(el);
    return () => {
      ro.disconnect();
      box.style.removeProperty("--addon-start-width");
    };
  }, [align]);

  return (
    <div
      ref={composedRef}
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex shrink-0 select-none items-center gap-1.5 text-muted-foreground [&_svg:not([class*=size-])]:size-4",
        "group-data-[size=sm]/control:text-xs",
        align === "inline-start" && "order-[-1] pl-3 has-[>button]:pl-1.5 group-data-[size=sm]/control:pl-2.5",
        align === "inline-end" && "order-1 pr-3 has-[>button]:pr-1.5 group-data-[size=sm]/control:pr-2.5",
        block && "w-full basis-full px-3 py-2",
        align === "block-start" && "order-[-2]",
        align === "block-end" && "order-2",
        divided && align === "block-start" && "border-b border-border",
        divided && align === "block-end" && "border-t border-border",
        "cursor-text",
        className,
      )}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if ((e.target as HTMLElement).closest(INTERACTIVE)) return;
        e.currentTarget
          .closest("[data-slot=input-group], [data-slot=field-control]")
          ?.querySelector<HTMLElement>("input:not([type=hidden]), textarea")
          ?.focus();
      }}
      {...props}
    />
  );
}

export function InputGroupText({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="input-group-text"
      className={cn(
        "flex shrink-0 select-none items-center whitespace-nowrap text-sm text-muted-foreground group-data-[size=sm]/control:text-xs",
        className,
      )}
      {...props}
    />
  );
}

export type InputGroupButtonProps = Omit<ButtonProps, "size"> & {
  size?: "xs" | "icon-xs" | "sm" | "icon";
};

export function InputGroupButton({
  variant = "ghost",
  size = "xs",
  type = "button",
  className,
  ...props
}: InputGroupButtonProps) {
  const unlabelled =
    (size === "icon-xs" || size === "icon") &&
    !props["aria-label"] &&
    !props["aria-labelledby"] &&
    !props.asChild;
  React.useEffect(() => {
    if (unlabelled && isDev()) {
      console.warn("InputGroupButton: icon-only buttons need an aria-label.");
    }
  }, [unlabelled]);
  return (
    <Button
      data-slot="input-group-button"
      variant={variant}
      size={size}
      type={type}
      className={cn("shrink-0 active:scale-[0.96]", className)}
      {...props}
    />
  );
}

const groupControl =
  "w-full min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed";

export type InputGroupInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  ref?: React.Ref<HTMLInputElement>;
};

/** Borderless input that fills the row. Inside a Field it takes the Field's id and wiring. */
export function InputGroupInput({
  className,
  id: idProp,
  onChange,
  ref,
  ...props
}: InputGroupInputProps) {
  const field = useOptionalField();
  const ownId = useId(idProp);
  useFieldValueSync(props.value, props.defaultValue, field?.setValueLength);
  const floating = field?.layout === "floating";
  return (
    <input
      ref={ref}
      id={field?.id ?? ownId}
      data-slot="input-group-control"
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      required={field?.required || undefined}
      disabled={field?.disabled || undefined}
      className={cn(
        groupControl,
        controlText,
        floating
          ? "h-11 pt-1 placeholder:text-transparent focus:placeholder:text-muted-foreground"
          : controlHeight,
        // Addons supply the inset on their side.
        "group-has-[>[data-align=inline-start]]/control:pl-2 group-has-[>[data-align=inline-end]]/control:pr-2",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field?.setValueLength(e.target.value.length);
      }}
      {...props}
    />
  );
}

export type InputGroupTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
};

/** Borderless textarea that grows with its content up to `max-h`. */
export function InputGroupTextarea({
  className,
  id: idProp,
  onChange,
  ref,
  ...props
}: InputGroupTextareaProps) {
  const field = useOptionalField();
  const ownId = useId(idProp);
  const localRef = React.useRef<HTMLTextAreaElement>(null);
  const composedRef = useComposedRefs(ref, localRef);
  useFieldValueSync(props.value, props.defaultValue, field?.setValueLength);
  const setMultiline = field?.setMultiline;
  React.useEffect(() => {
    if (!setMultiline) return;
    setMultiline(true);
    return () => setMultiline(false);
  }, [setMultiline]);

  const grow = React.useCallback(() => {
    const el = localRef.current;
    if (!el || CSS?.supports?.("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  React.useLayoutEffect(grow, [grow, props.value]);

  return (
    <textarea
      ref={composedRef}
      id={field?.id ?? ownId}
      data-slot="input-group-control"
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      required={field?.required || undefined}
      disabled={field?.disabled || undefined}
      className={cn(
        groupControl,
        controlText,
        "field-sizing-content max-h-64 min-h-16 resize-none py-2.5",
        className,
      )}
      onChange={(e) => {
        onChange?.(e);
        field?.setValueLength(e.target.value.length);
        grow();
      }}
      {...props}
    />
  );
}
