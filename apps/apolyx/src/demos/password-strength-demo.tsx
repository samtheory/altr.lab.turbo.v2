"use client";

import * as React from "react";
import { Field, PasswordInput, PasswordStrength } from "@altr/apolyx";

export default function PasswordStrengthDemo() {
  const [value, setValue] = React.useState("Apolyx");
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Field label="New password">
        <PasswordInput
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <PasswordStrength value={value} />
    </div>
  );
}
