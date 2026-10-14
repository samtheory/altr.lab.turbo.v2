"use client";

import { Input } from "@altr/apolyx";

export default function InputSizesDemo() {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <Input size="sm" placeholder="Small (h-8)" aria-label="Small" />
      <Input size="md" placeholder="Medium (h-10)" aria-label="Medium" />
      <Input size="lg" placeholder="Large (h-11)" aria-label="Large" />
    </div>
  );
}
