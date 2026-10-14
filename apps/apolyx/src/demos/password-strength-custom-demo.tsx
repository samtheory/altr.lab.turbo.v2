"use client";

import * as React from "react";
import { Field, PasswordInput, PasswordStrength } from "@altr/apolyx";

const common = new Set(["password", "123456", "qwerty", "letmein", "admin", "welcome"]);

// Stand-in for a real estimator such as zxcvbn: 0–4 from length and variety.
function estimate(value: string) {
  if (!value || common.has(value.toLowerCase())) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  const lengthScore = value.length >= 16 ? 2 : value.length >= 10 ? 1 : 0;
  return Math.min(4, lengthScore + Math.max(0, classes - 1));
}

export default function PasswordStrengthCustomDemo() {
  const [value, setValue] = React.useState("letmein");
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Field label="Passphrase" description="Try a long phrase — length beats symbols.">
        <PasswordInput autoComplete="new-password" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      <PasswordStrength
        value={value}
        score={estimate(value)}
        max={4}
        labels={{ weak: "Too guessable", fair: "Okay", good: "Solid", strong: "Excellent" }}
      />
    </div>
  );
}
