"use client";

import { Field, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@altr/apolyx";

export default function InputOTPDemo() {
  return (
    <Field label="Verification code" description="We sent a 6-digit code to •••• 0199.">
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}
