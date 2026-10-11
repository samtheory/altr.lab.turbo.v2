"use client";

import { Input, Label } from "@altr/apolyx";

export default function InputDemo() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <div className="space-y-2">
        <Label htmlFor="input-email">Email</Label>
        <Input id="input-email" type="email" placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="input-invalid">Username</Label>
        <Input id="input-invalid" aria-invalid defaultValue="admin" aria-describedby="input-invalid-hint" />
        <p id="input-invalid-hint" className="text-sm text-destructive">
          That username is taken.
        </p>
      </div>
      <Input disabled placeholder="Disabled" aria-label="Disabled input" />
    </div>
  );
}
