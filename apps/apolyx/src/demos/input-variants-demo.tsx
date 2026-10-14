"use client";

import { Input } from "@altr/apolyx";

const variants = ["outline", "filled", "underline", "ghost"] as const;

export default function InputVariantsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      {variants.map((variant) => (
        <div key={variant} className="grid gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">{variant}</span>
          <Input variant={variant} placeholder="Type to see the focus state" aria-label={variant} />
        </div>
      ))}
      <div className="grid gap-1.5">
        <span className="font-mono text-xs text-muted-foreground">outline · pill</span>
        <Input shape="pill" placeholder="Search everything" aria-label="Pill" />
      </div>
    </div>
  );
}
