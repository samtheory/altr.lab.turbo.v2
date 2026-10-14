"use client";

import { Input, Label } from "@altr/apolyx";

export default function InputValidationDemo() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="in-invalid">Username</Label>
        <Input
          id="in-invalid"
          defaultValue="admin"
          aria-invalid
          aria-describedby="in-invalid-hint"
        />
        <p id="in-invalid-hint" className="text-xs font-medium text-destructive">
          That username is taken.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="in-required">
          Company <span aria-hidden className="text-destructive">*</span>
        </Label>
        <Input id="in-required" required placeholder="Required" />
      </div>
    </div>
  );
}
