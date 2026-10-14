"use client";

import { Check, Moon, Sun, X } from "lucide-react";
import { Label, Switch } from "@altr/apolyx";

export default function SwitchIconsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="flex items-center gap-2">
        <Switch
          id="sw-theme"
          size="lg"
          tone="info"
          icons={{ checked: <Moon />, unchecked: <Sun /> }}
        />
        <Label htmlFor="sw-theme">Dark mode</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="sw-check"
          size="lg"
          tone="success"
          defaultChecked
          icons={{ checked: <Check strokeWidth={3} />, unchecked: <X strokeWidth={3} /> }}
        />
        <Label htmlFor="sw-check">Public profile</Label>
      </div>
    </div>
  );
}
