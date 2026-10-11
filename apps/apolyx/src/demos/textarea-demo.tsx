"use client";

import { Label, Textarea } from "@altr/apolyx";

export default function TextareaDemo() {
  return (
    <div className="grid w-full max-w-sm gap-2">
      <Label htmlFor="ta-feedback">Feedback</Label>
      <Textarea id="ta-feedback" placeholder="What should we build next?" />
    </div>
  );
}
