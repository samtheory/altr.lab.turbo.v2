"use client";

import { Label, Switch } from "@altr/apolyx";

export default function SwitchDemo() {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Switch id="sw-airplane" />
        <Label htmlFor="sw-airplane">Airplane mode</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="sw-sync" defaultChecked />
        <Label htmlFor="sw-sync">Background sync</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="sw-disabled" disabled />
        <Label htmlFor="sw-disabled">Beta features (locked)</Label>
      </div>
    </div>
  );
}
