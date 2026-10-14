"use client";

import * as React from "react";
import { Input, Label } from "@altr/apolyx";

export default function InputFileColorRangeDemo() {
  const [color, setColor] = React.useState("#3b82f6");
  const [volume, setVolume] = React.useState(64);
  return (
    <div className="grid w-full max-w-sm gap-5">
      <div className="grid gap-1.5">
        <Label htmlFor="in-file">Attachment</Label>
        <Input id="in-file" type="file" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="in-color">Brand colour</Label>
        <div className="flex items-center gap-3">
          <Input
            id="in-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-14 shrink-0"
          />
          <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs uppercase">{color}</code>
        </div>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="in-range">Volume</Label>
          <output htmlFor="in-range" className="font-mono text-xs tabular-nums text-muted-foreground">
            {volume}%
          </output>
        </div>
        <Input
          id="in-range"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
