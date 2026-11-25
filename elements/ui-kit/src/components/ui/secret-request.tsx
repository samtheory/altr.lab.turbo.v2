"use client";

import * as React from "react";
import { KeyRound, Shield } from "lucide-react";

import { cn } from "../../lib/utils";
import { useId } from "../../primitives/use-id";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

export type SecretRequestProps = {
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  className?: string;
};

/** Card that asks the user for a secret or API key with masked input. */
export function SecretRequest({
  title = "API key required",
  description = "The agent needs a credential that is never sent to the model.",
  label = "Secret",
  placeholder = "sk-…",
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  className,
}: SecretRequestProps) {
  const id = useId();
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  function setValue(next: string) {
    if (valueProp === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.(value);
  }

  return (
    <form
      data-slot="secret-request"
      onSubmit={handleSubmit}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-4 flex items-start gap-2.5">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground"
          aria-hidden
        >
          <KeyRound className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mb-3 space-y-1.5">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        <Input
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="font-mono text-sm"
        />
      </div>
      <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Shield className="size-3 shrink-0" aria-hidden />
        Stored locally for this session only.
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1" disabled={!value.trim()}>
          {submitLabel}
        </Button>
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </form>
  );
}