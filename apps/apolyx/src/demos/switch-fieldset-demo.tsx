"use client";

import { FieldSet, SwitchField } from "@altr/apolyx";

export default function SwitchFieldsetDemo() {
  return (
    <FieldSet
      legend="Notifications"
      description="Choose what we email you about."
      className="w-full max-w-sm"
    >
      <SwitchField label="Comments" description="When someone replies to you." defaultChecked />
      <SwitchField label="Mentions" description="When someone @mentions you." defaultChecked />
      <SwitchField label="Weekly digest" description="A Monday summary of activity." />
    </FieldSet>
  );
}
