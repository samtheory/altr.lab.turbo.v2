"use client";

import { Field, MaskedInput, masks } from "@altr/apolyx";

export default function InputMaskDemo() {
  return (
    <div className="w-full max-w-xs">
      <Field label="Phone" description="We only call about your order.">
        <MaskedInput mask={masks.phoneUS} name="phone" autoComplete="tel-national" />
      </Field>
    </div>
  );
}
