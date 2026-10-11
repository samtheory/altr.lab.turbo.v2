"use client";

import * as React from "react";
import { Checkbox, Label } from "@altr/apolyx";

export default function CheckboxDemo() {
  const [items, setItems] = React.useState({ email: true, sms: false });
  const all = items.email && items.sms;
  const some = items.email || items.sms;
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Notifications</legend>
      <div className="flex items-center gap-2">
        <Checkbox
          id="cb-all"
          checked={all ? true : some ? "indeterminate" : false}
          onCheckedChange={(v) => setItems({ email: v === true, sms: v === true })}
        />
        <Label htmlFor="cb-all">All notifications</Label>
      </div>
      {(["email", "sms"] as const).map((key) => (
        <div key={key} className="ml-6 flex items-center gap-2">
          <Checkbox
            id={`cb-${key}`}
            checked={items[key]}
            onCheckedChange={(v) => setItems((s) => ({ ...s, [key]: v === true }))}
          />
          <Label htmlFor={`cb-${key}`}>{key === "email" ? "Email" : "SMS"}</Label>
        </div>
      ))}
    </fieldset>
  );
}
