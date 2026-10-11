"use client";

import { Checkbox, Label } from "@altr/apolyx";

export default function LabelDemo() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="label-terms" />
      <Label htmlFor="label-terms">Accept terms and conditions</Label>
    </div>
  );
}
