"use client";

import * as React from "react";
import { Field, PasswordInput, PasswordStrength } from "@altr/apolyx";

export default function PasswordStrengthChecklistDemo() {
  const [a, setA] = React.useState("apolyx2026");
  const [b, setB] = React.useState("Apolyx");
  return (
    <div className="grid w-full max-w-2xl gap-8 sm:grid-cols-2">
      <div className="grid content-start gap-3">
        <Field label="Checklist">
          <PasswordInput autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} />
        </Field>
        <PasswordStrength value={a} variant="checklist" />
      </div>
      <div className="grid content-start gap-3">
        <Field label="Bar and checklist">
          <PasswordInput autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} />
        </Field>
        <PasswordStrength value={b} variant="both" />
      </div>
    </div>
  );
}
