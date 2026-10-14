"use client";

import * as React from "react";
import { Alert, AlertDescription, AlertTitle, Button, type ButtonProps } from "@altr/apolyx";

export type FieldErrors = Record<string, string | string[]>;

export type FormState = {
  status: "idle" | "error" | "success";
  errors: FieldErrors;
};

export const idle: FormState = { status: "idle", errors: {} };

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Every string entry of a FormData. */
export function formValues(data: FormData) {
  const out: Record<string, string> = {};
  data.forEach((v, k) => {
    if (typeof v === "string") out[k] = v;
  });
  return out;
}

/**
 * `useActionState` driven from `onSubmit`. Passing the action to `<form action>`
 * makes React reset the form after every submit, which clears inputs on a failed
 * submit and desyncs controls that keep their own state (Checkbox, Switch).
 */
export function useFormAction<S>(action: (prev: Awaited<S>, data: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = React.useActionState<S, FormData>(action, initial);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    React.startTransition(() => dispatch(data));
  };
  return { state, pending, onSubmit };
}

/** Submit button with the form's pending state: spinner, disabled, `aria-busy`. */
export function SubmitButton({ pending, ...props }: Omit<ButtonProps, "type" | "loading"> & { pending: boolean }) {
  return <Button type="submit" loading={pending} {...props} />;
}

/** After a failed submit, focus the first control marked invalid. */
export function useFocusFirstInvalid(formRef: React.RefObject<HTMLFormElement | null>, state: FormState) {
  React.useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, formRef]);
}

/** Lists every error with a link that focuses its control. */
export function ErrorSummary({
  errors,
  labels,
  idPrefix,
}: {
  errors: FieldErrors;
  labels: Record<string, string>;
  idPrefix: string;
}) {
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>
        {keys.length === 1 ? "1 field needs attention" : `${keys.length} fields need attention`}
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {keys.map((k) => (
            <li key={k}>
              <a
                href={`#${idPrefix}-${k}`}
                className="underline underline-offset-4"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`${idPrefix}-${k}`)?.focus();
                }}
              >
                {labels[k] ?? k}
              </a>
              {": "}
              {[errors[k]].flat()[0]}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
