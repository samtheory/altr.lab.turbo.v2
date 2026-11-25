"use client";

import * as React from "react";
import { HeroWaitlist } from "@altr/apolyx";

export default function Demo() {
  const [email, setEmail] = React.useState("");

  return (
    <div className="flex w-full justify-center p-4">
      <HeroWaitlist email={email} onEmailChange={setEmail} />
    </div>
  );
}
