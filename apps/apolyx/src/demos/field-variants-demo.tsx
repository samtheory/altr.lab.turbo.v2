"use client";

import { Field, FieldInput } from "@altr/apolyx";

export default function FieldVariantsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Filled · small" variant="filled" size="sm">
        <FieldInput placeholder="Compact filter" />
      </Field>
      <Field label="Underline · floating" variant="underline" layout="floating">
        <FieldInput />
      </Field>
      <Field label="Outline · large · pill" size="lg" shape="pill">
        <FieldInput placeholder="Roomy search" className="px-5" />
      </Field>
    </div>
  );
}
