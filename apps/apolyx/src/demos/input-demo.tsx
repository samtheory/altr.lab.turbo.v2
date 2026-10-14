"use client";

import { Input, Label } from "@altr/apolyx";

export default function InputDemo() {
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="input-email">Email</Label>
      <Input id="input-email" type="email" placeholder="you@apolyx.dev" />
    </div>
  );
}
