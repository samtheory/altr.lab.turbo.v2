"use client";

import { InputGroupAddon, InputGroupText, Label, NumberInput } from "@altr/apolyx";

export default function NumberInputFormatDemo() {
  return (
    <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="ni-currency">Currency</Label>
        <NumberInput
          id="ni-currency"
          layout="stacked"
          defaultValue={1200.5}
          step={10}
          min={0}
          locale="en-US"
          format={{ style: "currency", currency: "USD" }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ni-percent">Percent</Label>
        <NumberInput
          id="ni-percent"
          layout="stacked"
          defaultValue={0.15}
          step={0.01}
          min={0}
          max={1}
          format={{ style: "percent", maximumFractionDigits: 1 }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ni-unit">Unit suffix</Label>
        <NumberInput id="ni-unit" layout="stacked" defaultValue={72.5} step={0.5} min={0}>
          <InputGroupAddon align="inline-end">
            <InputGroupText>kg</InputGroupText>
          </InputGroupAddon>
        </NumberInput>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ni-de">
          Locale <span className="font-mono text-xs font-normal text-muted-foreground">de-DE</span>
        </Label>
        <NumberInput
          id="ni-de"
          layout="stacked"
          defaultValue={1234.5}
          locale="de-DE"
          format={{ style: "currency", currency: "EUR" }}
        />
      </div>
    </div>
  );
}
