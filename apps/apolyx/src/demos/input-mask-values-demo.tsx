"use client";

import * as React from "react";
import { Button, Field, MaskedInput, masks, Switch } from "@altr/apolyx";

export default function InputMaskValuesDemo() {
  const [raw, setRaw] = React.useState("4155550132");
  const [formatted, setFormatted] = React.useState("(415) 555-0132");
  const [guide, setGuide] = React.useState(true);
  const [submitted, setSubmitted] = React.useState<string | null>(null);

  return (
    <form
      className="grid w-full max-w-sm gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(String(new FormData(e.currentTarget).get("phone")));
      }}
    >
      <Field label="Phone">
        <MaskedInput
          mask={masks.phoneUS}
          name="phone"
          value={raw}
          showGuide={guide}
          onValueChange={(r, f) => {
            setRaw(r);
            setFormatted(f);
          }}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={guide} onCheckedChange={setGuide} size="sm" />
        Show guide
      </label>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border border-border bg-muted/40 p-3 font-mono text-xs">
        <dt className="text-muted-foreground">raw</dt>
        <dd>{raw || "—"}</dd>
        <dt className="text-muted-foreground">formatted</dt>
        <dd>{formatted || "—"}</dd>
        <dt className="text-muted-foreground">submitted</dt>
        <dd>{submitted ?? "—"}</dd>
      </dl>
      <Button type="submit" variant="outline" className="justify-self-start">
        Submit
      </Button>
    </form>
  );
}
