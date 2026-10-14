"use client";

import { Field, InputOTP, InputOTPGroup, InputOTPSlot } from "@altr/apolyx";

function Six() {
  return (
    <InputOTPGroup>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <InputOTPSlot key={i} index={i} />
      ))}
    </InputOTPGroup>
  );
}

export default function InputOTPStatesDemo() {
  return (
    <div className="grid gap-6">
      <Field label="Invalid" error="That code has expired. Request a new one.">
        <InputOTP maxLength={6} defaultValue="381904">
          <Six />
        </InputOTP>
      </Field>
      <Field label="Verified" description="Code accepted.">
        <InputOTP maxLength={6} defaultValue="424242" tone="success">
          <Six />
        </InputOTP>
      </Field>
      <div className="grid gap-3">
        {(["sm", "md", "lg"] as const).map((size) => (
          <InputOTP key={size} maxLength={6} size={size} defaultValue="123" aria-label={`Size ${size}`}>
            <Six />
          </InputOTP>
        ))}
      </div>
    </div>
  );
}
