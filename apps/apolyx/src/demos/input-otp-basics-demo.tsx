"use client";

import { Field, InputOTP, InputOTPGroup, InputOTPSlot } from "@altr/apolyx";

function Slots({ count }: { count: number }) {
  return (
    <InputOTPGroup>
      {Array.from({ length: count }, (_, i) => (
        <InputOTPSlot key={i} index={i} />
      ))}
    </InputOTPGroup>
  );
}

export default function InputOTPBasicsDemo() {
  return (
    <div className="grid gap-6">
      <Field label="6 digits">
        <InputOTP maxLength={6}>
          <Slots count={6} />
        </InputOTP>
      </Field>
      <Field label="4 digits">
        <InputOTP maxLength={4}>
          <Slots count={4} />
        </InputOTP>
      </Field>
      <Field label="Disabled" disabled>
        <InputOTP maxLength={4} defaultValue="27">
          <Slots count={4} />
        </InputOTP>
      </Field>
    </div>
  );
}
