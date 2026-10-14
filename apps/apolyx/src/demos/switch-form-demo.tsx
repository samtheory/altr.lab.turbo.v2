"use client";

import * as React from "react";
import { Button, FieldSet, SwitchField } from "@altr/apolyx";

export default function SwitchFormDemo() {
  const [submitted, setSubmitted] = React.useState<string>();
  return (
    <form
      className="grid w-full max-w-sm gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        setSubmitted(JSON.stringify(data));
      }}
    >
      <FieldSet legend="Email me about">
        <SwitchField name="product" label="Product updates" defaultChecked />
        <SwitchField name="security" label="Security alerts" defaultChecked />
        <SwitchField name="marketing" label="Offers" />
      </FieldSet>
      <Button type="submit" size="sm" className="justify-self-start">
        Save
      </Button>
      {submitted ? (
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          FormData: <span className="text-foreground">{submitted}</span>
        </p>
      ) : null}
    </form>
  );
}
