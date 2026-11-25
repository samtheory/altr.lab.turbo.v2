"use client";

import * as React from "react";
import { InputOTPField, toast } from "@altr/apolyx";

export default function InputOTPFieldDemo() {
  const [code, setCode] = React.useState("");
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  return (
    <InputOTPField
      maxLength={6}
      value={code}
      onValueChange={setCode}
      onComplete={() => toast.success("Code complete")}
      cooldown={cooldown}
      onResend={() => {
        setCode("");
        setCooldown(30);
        toast("New code sent");
      }}
    />
  );
}
