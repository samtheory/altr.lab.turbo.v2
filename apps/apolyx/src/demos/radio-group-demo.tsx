"use client";

import * as React from "react";
import { Label, RadioGroup, RadioGroupItem } from "@altr/apolyx";

export default function RadioGroupDemo() {
  const [density, setDensity] = React.useState("comfortable");
  return (
    <RadioGroup value={density} onValueChange={setDensity} aria-label="Density">
      {[
        { value: "compact", label: "Compact" },
        { value: "comfortable", label: "Comfortable" },
        { value: "spacious", label: "Spacious" },
      ].map((opt) => (
        <div key={opt.value} className="flex items-center gap-2">
          <RadioGroupItem value={opt.value} id={`density-${opt.value}`} />
          <Label htmlFor={`density-${opt.value}`}>{opt.label}</Label>
        </div>
      ))}
    </RadioGroup>
  );
}
