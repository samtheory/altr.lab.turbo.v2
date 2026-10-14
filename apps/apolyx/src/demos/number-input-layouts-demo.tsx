"use client";

import { Label, NumberInput } from "@altr/apolyx";

export default function NumberInputLayoutsDemo() {
  return (
    <div className="grid w-full max-w-xl gap-4 sm:grid-cols-3">
      <div className="grid gap-1.5">
        <Label htmlFor="ni-split">Split</Label>
        <NumberInput id="ni-split" defaultValue={2} min={0} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ni-stacked">Stacked</Label>
        <NumberInput id="ni-stacked" layout="stacked" defaultValue={24} min={0} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ni-none">No steppers</Label>
        <NumberInput id="ni-none" layout="none" defaultValue={1024} />
      </div>
    </div>
  );
}
