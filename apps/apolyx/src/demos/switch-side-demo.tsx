"use client";

import { SwitchField } from "@altr/apolyx";

export default function SwitchSideDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <SwitchField side="start" label="Switch first" description="Good for checklists read top-down." />
      <SwitchField side="end" label="Switch last" description="The settings-screen default." />
    </div>
  );
}
