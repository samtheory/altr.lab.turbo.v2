"use client";

import * as React from "react";
import { PasswordRules } from "@altr/apolyx";

export default function PasswordRulesDemo() {
  const [value, setValue] = React.useState("");
  return (
    <PasswordRules
      label="Choose a password"
      value={value}
      onValueChange={(next) => setValue(next)}
      placeholder="Create a password"
    />
  );
}
