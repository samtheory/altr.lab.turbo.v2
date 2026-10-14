"use client";

import { Label, Switch } from "@altr/apolyx";

const sizes = ["sm", "md", "lg"] as const;

export default function SwitchSizesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      {sizes.map((size) => (
        <div key={size} className="flex items-center gap-2">
          <Switch id={`sw-size-${size}`} size={size} defaultChecked />
          <Label htmlFor={`sw-size-${size}`} className="font-mono text-xs">
            {size}
          </Label>
        </div>
      ))}
    </div>
  );
}
