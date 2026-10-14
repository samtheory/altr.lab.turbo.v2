"use client";

import { Label, Switch } from "@altr/apolyx";

export default function SwitchLabelsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex items-center gap-2">
        <Switch id="sw-labels" size="lg" labels={{ checked: "On", unchecked: "Off" }} />
        <Label htmlFor="sw-labels">Notifications</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="sw-labels-live"
          size="lg"
          tone="success"
          defaultChecked
          labels={{ checked: "Live", unchecked: "Draft" }}
        />
        <Label htmlFor="sw-labels-live">Visibility</Label>
      </div>
    </div>
  );
}
