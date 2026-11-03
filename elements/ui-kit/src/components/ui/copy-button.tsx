"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

import { Button, type ButtonProps } from "./button";

export type CopyButtonProps = Omit<ButtonProps, "onClick" | "children" | "value"> & {
  value: string;
  /** Accessible subject, e.g. "publishable key" -> "Copy publishable key". */
  label: string;
  onCopied?: () => void;
};

/** Copies `value` to the clipboard; announces the result through a polite live region. */
export function CopyButton({
  value,
  label,
  onCopied,
  variant = "outline",
  size = "sm",
  ...props
}: CopyButtonProps) {
  const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      onCopied?.();
    } catch {
      setState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1600);
  }
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        aria-label={`Copy ${label}`}
        data-slot="copy-button"
        onClick={() => void copy()}
        {...props}
      >
        {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
        {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : "Copy"}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied"
          ? `${label} copied`
          : state === "failed"
            ? `Could not copy ${label}`
            : ""}
      </span>
    </>
  );
}
