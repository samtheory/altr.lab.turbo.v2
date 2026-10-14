"use client";

import * as React from "react";
import { AtSign, Check, X } from "lucide-react";
import { Field, InputGroupAddon, InputGroupInput, Spinner, toast } from "@altr/apolyx";

import { SubmitButton, idle, useFormAction, wait, type FormState } from "./form-shared";

const TAKEN = new Set(["admin", "apolyx", "ada", "root", "support"]);
const VALID = /^[a-z0-9_]{3,20}$/;

type Check = { name: string; status: "checking" | "available" | "taken" | "invalid" };

export default function FormAsyncCheckDemo() {
  const [name, setName] = React.useState("");
  const [check, setCheck] = React.useState<Check | null>(null);
  const { pending, onSubmit } = useFormAction(async (): Promise<FormState> => {
    await wait(500);
    toast.success(`Claimed @${name}`);
    return idle;
  }, idle);

  React.useEffect(() => {
    if (!name) return;
    if (!VALID.test(name)) {
      setCheck({ name, status: "invalid" });
      return;
    }
    setCheck({ name, status: "checking" });
    let cancelled = false;
    const t = window.setTimeout(async () => {
      await wait(500);
      if (!cancelled) setCheck({ name, status: TAKEN.has(name) ? "taken" : "available" });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [name]);

  const current = name && check?.name === name ? check.status : null;
  const error =
    current === "taken"
      ? `@${name} is taken.`
      : current === "invalid"
        ? "Use 3–20 lowercase letters, numbers or underscores."
        : undefined;

  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-sm gap-4">
      <Field
        label="Username"
        description={current === "available" ? `@${name} is available.` : "Try ada or apolyx to see a taken name."}
        error={error}
      >
        <InputGroupAddon>
          <AtSign />
        </InputGroupAddon>
        <InputGroupInput
          name="username"
          autoComplete="username"
          spellCheck={false}
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
        />
        <InputGroupAddon align="inline-end" aria-live="polite">
          {current === "checking" ? <Spinner label="Checking availability" /> : null}
          {current === "available" ? <Check className="text-success" aria-label="Available" /> : null}
          {current === "taken" ? <X className="text-destructive" aria-label="Taken" /> : null}
        </InputGroupAddon>
      </Field>
      <SubmitButton pending={pending} disabled={current !== "available"}>
        Claim username
      </SubmitButton>
    </form>
  );
}
