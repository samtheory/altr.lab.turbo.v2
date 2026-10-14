"use client";

import { Field, FieldCounter, FieldInput, FieldTextarea } from "@altr/apolyx";

export default function FieldCounterDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Headline" description="Keep it short.">
        <FieldInput defaultValue="Apolyx ships forms" />
        <FieldCounter max={24} />
      </Field>
      <Field label="Status update" description="Turns amber near the limit and red past it.">
        <FieldTextarea defaultValue="Shipping the input catalog this sprint: groups, OTP, masks and a lot of tiny details that make forms feel calm." />
        <FieldCounter max={120} />
      </Field>
    </div>
  );
}
