"use client";

import { Field, FieldInput, FieldSet } from "@altr/apolyx";

export default function FieldFieldsetDemo() {
  return (
    <FieldSet
      legend="Shipping address"
      description="Where we send hardware keys."
      className="w-full max-w-md"
    >
      <Field label="Street">
        <FieldInput autoComplete="street-address" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="City">
          <FieldInput autoComplete="address-level2" />
        </Field>
        <Field label="Postcode">
          <FieldInput autoComplete="postal-code" />
        </Field>
      </div>
    </FieldSet>
  );
}
