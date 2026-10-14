"use client";

import { Lock } from "lucide-react";
import { InputGroupAddon, Label, PasswordInput } from "@altr/apolyx";

export default function PasswordInputBasicsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="pw-plain">Standalone</Label>
        <PasswordInput id="pw-plain" placeholder="Enter a password" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw-icon">With a start icon</Label>
        <PasswordInput id="pw-icon" defaultValue="s3cret!">
          <InputGroupAddon>
            <Lock />
          </InputGroupAddon>
        </PasswordInput>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw-disabled">Disabled</Label>
        <PasswordInput id="pw-disabled" defaultValue="locked-value" disabled />
      </div>
    </div>
  );
}
