"use client";

import { Label, Switch } from "@altr/apolyx";

const tones = ["primary", "success", "warning", "info", "destructive"] as const;

export default function SwitchTonesDemo() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      {tones.map((tone) => (
        <div key={tone} className="flex items-center gap-2">
          <Switch id={`sw-tone-${tone}`} tone={tone} defaultChecked />
          <Label htmlFor={`sw-tone-${tone}`} className="font-mono text-xs">
            {tone}
          </Label>
        </div>
      ))}
    </div>
  );
}
