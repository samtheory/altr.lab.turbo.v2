"use client";

import * as React from "react";
import { Field, MaskedInput, masks } from "@altr/apolyx";

export default function InputMaskValidationDemo() {
  const [error, setError] = React.useState<string | undefined>();

  return (
    <div className="w-full max-w-xs">
      <Field label="Date of birth" description="MM/DD/YYYY" error={error} required>
        <MaskedInput
          mask={masks.date}
          showGuide
          autoComplete="bday"
          onValueChange={() => setError(undefined)}
          onCompleteChange={(complete) => setError(complete ? undefined : "Enter the full date.")}
        />
      </Field>
    </div>
  );
}
