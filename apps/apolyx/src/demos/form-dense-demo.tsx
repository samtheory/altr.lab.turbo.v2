"use client";

import * as React from "react";
import { Button, Checkbox, Field, FieldInput, Label, NumberInput } from "@altr/apolyx";

const statuses = ["Active", "Paused", "Archived"] as const;

export default function FormDenseDemo() {
  const [summary, setSummary] = React.useState<string | null>(null);
  const [formKey, setFormKey] = React.useState(0);

  return (
    <form
      key={formKey}
      className="grid w-full max-w-60 gap-3 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setSummary(
          [
            data.get("q") && `“${data.get("q")}”`,
            `${data.get("min") || 0}–${data.get("max") || "∞"} seats`,
            data.getAll("status").join(", ") || "any status",
          ]
            .filter(Boolean)
            .join(" · "),
        );
      }}
      onReset={(e) => {
        // Kit controls keep their own state, so remount instead of a native reset.
        e.preventDefault();
        setSummary(null);
        setFormKey((k) => k + 1);
      }}
    >
      <Field label="Search" size="sm">
        <FieldInput name="q" placeholder="Project name" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Min seats" size="sm">
          <NumberInput name="min" min={0} layout="none" />
        </Field>
        <Field label="Max seats" size="sm">
          <NumberInput name="max" min={0} layout="none" />
        </Field>
      </div>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-xs font-medium">Status</legend>
        {statuses.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <Checkbox id={`dense-${s}`} name="status" value={s} defaultChecked={s === "Active"} />
            <Label htmlFor={`dense-${s}`} className="text-xs font-normal">
              {s}
            </Label>
          </div>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">
          Apply
        </Button>
        <Button type="reset" size="sm" variant="ghost">
          Clear
        </Button>
      </div>
      {summary ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {summary}
        </p>
      ) : null}
    </form>
  );
}
