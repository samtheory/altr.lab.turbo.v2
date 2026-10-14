"use client";

import { FieldSet, SwitchField } from "@altr/apolyx";

export default function SwitchFramedDemo() {
  return (
    <FieldSet legend="Privacy" variant="framed" className="w-full max-w-md">
      <SwitchField label="Show online status" description="Others see when you are active." defaultChecked />
      <SwitchField label="Read receipts" description="Let senders know you have read a message." />
      <SwitchField label="Searchable profile" description="Appear in member search." defaultChecked />
      <SwitchField label="Share usage data" description="Helps us improve Apolyx." tone="info" />
    </FieldSet>
  );
}
