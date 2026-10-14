"use client";

import * as React from "react";
import { CircleCheck } from "lucide-react";
import { Field, PasswordInput } from "@altr/apolyx";

export default function PasswordConfirmDemo() {
  const [password, setPassword] = React.useState("Orbit-42!");
  const [confirm, setConfirm] = React.useState("Orbit-4");
  const touched = confirm.length > 0;
  const matches = touched && confirm === password;
  return (
    <div className="grid w-full max-w-sm gap-4">
      <Field label="New password">
        <PasswordInput
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field
        label="Confirm password"
        error={touched && !matches ? "Passwords don't match yet." : undefined}
        description={
          matches ? (
            <span className="inline-flex items-center gap-1 text-success">
              <CircleCheck className="size-3.5" /> Passwords match
            </span>
          ) : undefined
        }
      >
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
    </div>
  );
}
