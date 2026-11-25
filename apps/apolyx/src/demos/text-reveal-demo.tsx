"use client";

import { TextReveal } from "@altr/apolyx";

export default function TextRevealDemo() {
  return (
    <div className="max-w-md p-4 text-2xl font-semibold tracking-tight">
      <TextReveal text="Words that arrive one at a time." as="h2" />
    </div>
  );
}
