"use client";

import { SubscribeField, toast } from "@altr/apolyx";

export default function SubscribeFieldDemo() {
  return (
    <SubscribeField
      buttonLabel="Get early access"
      countLabel="Makers on the list"
      defaultCount={214}
      simulate
      onSubmit={(email) => toast.success(`Subscribed ${email}`)}
    />
  );
}
