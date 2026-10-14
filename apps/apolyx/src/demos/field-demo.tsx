"use client";

import { Field, FieldInput, FieldTextarea } from "@altr/apolyx";

export default function FieldDemo() {
  return (
    <div className="grid w-full max-w-md gap-6">
      <Field label="Email" layout="top" description="We never share it.">
        <FieldInput type="email" placeholder="you@apolyx.dev" />
      </Field>
      <Field label="Full name" layout="floating" required>
        <FieldInput placeholder="Ada Lovelace" />
      </Field>
      <Field label="Username" layout="floating" error="That handle is taken.">
        <FieldInput defaultValue="apollo" />
      </Field>
      <Field label="Host" layout="inline" labelWidth="5.5rem">
        <FieldInput placeholder="api.apolyx.dev" />
      </Field>
      <Field label="About" layout="floating">
        <FieldTextarea placeholder="A few words…" />
      </Field>
    </div>
  );
}
