"use client";

import * as React from "react";
import { Field, InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@altr/apolyx";

function Group({ from, count }: { from: number; count: number }) {
  return (
    <InputOTPGroup>
      {Array.from({ length: count }, (_, i) => (
        <InputOTPSlot key={i} index={from + i} />
      ))}
    </InputOTPGroup>
  );
}

export default function InputOTPPatternsDemo() {
  const [license, setLicense] = React.useState("APLX7Q");
  return (
    <div className="grid gap-6">
      <Field label="Digits only" description="Letters are ignored.">
        <InputOTP maxLength={6} pattern="digits">
          <Group from={0} count={6} />
        </InputOTP>
      </Field>
      <Field label="License key" description={`Value: ${license || "—"}`}>
        <InputOTP
          maxLength={12}
          pattern="alphanumeric"
          size="sm"
          value={license}
          onValueChange={setLicense}
        >
          <Group from={0} count={4} />
          <InputOTPSeparator />
          <Group from={4} count={4} />
          <InputOTPSeparator />
          <Group from={8} count={4} />
        </InputOTP>
      </Field>
      <Field label="PIN" description="Characters are masked.">
        <InputOTP maxLength={4} mask defaultValue="19">
          <InputOTPGroup className="gap-2 [&>*]:rounded-md [&>*]:border-l">
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </Field>
    </div>
  );
}
