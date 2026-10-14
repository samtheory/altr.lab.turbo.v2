"use client";

import { Input, Label } from "@altr/apolyx";

export default function InputBasicsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="in-default">Project name</Label>
        <Input id="in-default" placeholder="apolyx-docs" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="in-disabled">Workspace</Label>
        <Input id="in-disabled" defaultValue="altr.lab" disabled />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="in-readonly">Project id</Label>
        <Input id="in-readonly" defaultValue="prj_8f2c41d0" readOnly className="font-mono" />
      </div>
    </div>
  );
}
