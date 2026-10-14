"use client";

import { Field, FieldInput } from "@altr/apolyx";

export default function FieldErrorsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Username" description="Letters, numbers and dashes." error="That handle is taken.">
        <FieldInput defaultValue="apollo" />
      </Field>
      <Field
        label="New password"
        error={["At least 12 characters", "Include a number", "Include a symbol"]}
      >
        <FieldInput type="password" defaultValue="hunter" />
      </Field>
    </div>
  );
}
