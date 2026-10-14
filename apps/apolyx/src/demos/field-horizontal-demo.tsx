"use client";

import { Field, FieldInput, FieldTextarea } from "@altr/apolyx";

export default function FieldHorizontalDemo() {
  return (
    <div className="grid w-full max-w-2xl gap-6">
      <Field orientation="horizontal" label="Display name" description="Shown on your posts and comments.">
        <FieldInput defaultValue="Ada Lovelace" />
      </Field>
      <Field orientation="horizontal" label="Email" description="Used for sign-in and receipts." required>
        <FieldInput type="email" defaultValue="ada@apolyx.dev" />
      </Field>
      <Field orientation="horizontal" label="Bio" description="A sentence or two." optional>
        <FieldTextarea placeholder="Mathematician, first programmer." />
      </Field>
    </div>
  );
}
