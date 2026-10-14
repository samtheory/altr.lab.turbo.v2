"use client";

import * as React from "react";
import { Field, NumberInput } from "@altr/apolyx";

export default function NumberInputDemo() {
  const [seats, setSeats] = React.useState<number | null>(5);
  return (
    <Field label="Seats" description={`${seats ?? 0} × $12 / month`} className="w-full max-w-[14rem]">
      <NumberInput value={seats} onValueChange={setSeats} min={1} max={99} name="seats" />
    </Field>
  );
}
