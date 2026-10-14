"use client";

import { FieldSet, SwitchField } from "@altr/apolyx";

export default function SwitchDemo() {
  return (
    <FieldSet legend="Connectivity" variant="framed" className="w-full max-w-sm">
      <SwitchField label="Airplane mode" description="Turns off every wireless radio." />
      <SwitchField label="Background sync" description="Keeps drafts up to date." defaultChecked />
      <SwitchField label="Beta channel" description="Locked by your organisation." disabled />
    </FieldSet>
  );
}
