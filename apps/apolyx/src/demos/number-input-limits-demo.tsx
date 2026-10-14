"use client";

import * as React from "react";
import { Field, NumberInput } from "@altr/apolyx";

export default function NumberInputLimitsDemo() {
  const [guests, setGuests] = React.useState<number | null>(12);
  return (
    <div className="grid w-full max-w-lg gap-4 sm:grid-cols-2">
      <Field label="Rating" description="1 to 5. Type 9 and blur — it clamps.">
        <NumberInput defaultValue={4} min={1} max={5} />
      </Field>
      <Field label="Hours" description="Steps of 0.5">
        <NumberInput defaultValue={7.5} step={0.5} min={0} max={24} />
      </Field>
      <Field label="Locked" disabled>
        <NumberInput defaultValue={3} />
      </Field>
      <Field
        label="Guests"
        error={guests !== null && guests > 10 ? "The room fits 10 people." : undefined}
      >
        <NumberInput value={guests} onValueChange={setGuests} min={1} />
      </Field>
    </div>
  );
}
