"use client";

import { Label, Switch } from "@altr/apolyx";

export default function SwitchLabelDemo() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Switch id="sw-airplane" />
        <Label htmlFor="sw-airplane">Airplane mode</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="sw-off-disabled" disabled />
        <Label htmlFor="sw-off-disabled">Disabled, off</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="sw-on-disabled" disabled defaultChecked />
        <Label htmlFor="sw-on-disabled">Disabled, on</Label>
      </div>
    </div>
  );
}
