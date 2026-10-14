"use client";

import * as React from "react";
import { FieldSet, Label, NumberInput } from "@altr/apolyx";

const usd = { style: "currency", currency: "USD", maximumFractionDigits: 0 } as const;

export default function NumberInputRangeDemo() {
  const [low, setLow] = React.useState<number | null>(20);
  const [high, setHigh] = React.useState<number | null>(150);
  return (
    <FieldSet legend="Price range" description="Filter products by price." className="w-full max-w-sm">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="price-min" className="text-xs text-muted-foreground">
            Min
          </Label>
          <NumberInput
            id="price-min"
            layout="none"
            locale="en-US"
            format={usd}
            min={0}
            max={high ?? undefined}
            step={5}
            value={low}
            onValueChange={setLow}
          />
        </div>
        <span aria-hidden className="pb-2.5 text-muted-foreground">
          –
        </span>
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor="price-max" className="text-xs text-muted-foreground">
            Max
          </Label>
          <NumberInput
            id="price-max"
            layout="none"
            locale="en-US"
            format={usd}
            min={low ?? 0}
            step={5}
            value={high}
            onValueChange={setHigh}
          />
        </div>
      </div>
    </FieldSet>
  );
}
