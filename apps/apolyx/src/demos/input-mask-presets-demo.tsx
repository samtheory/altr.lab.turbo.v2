"use client";

import { Field, MaskedInput, masks } from "@altr/apolyx";

export default function InputMaskPresetsDemo() {
  return (
    <div className="grid w-full max-w-md gap-5 sm:grid-cols-2">
      <Field label="Phone">
        <MaskedInput mask={masks.phoneUS} autoComplete="tel-national" />
      </Field>
      <Field label="Date of birth" description="MM/DD/YYYY">
        <MaskedInput mask={masks.date} autoComplete="bday" />
      </Field>
      <Field label="Start time">
        <MaskedInput mask={masks.time} />
      </Field>
      <Field label="ZIP code" description="ZIP+4 is optional.">
        <MaskedInput mask={masks.zipUS} autoComplete="postal-code" />
      </Field>
    </div>
  );
}
