"use client";

import { Field, PasswordInput } from "@altr/apolyx";

export default function PasswordInputDemo() {
  return (
    <Field
      label="Password"
      className="w-full max-w-sm"
      labelAside={
        <a href="#reset" className="font-medium text-primary underline-offset-4 hover:underline">
          Forgot password?
        </a>
      }
    >
      <PasswordInput defaultValue="correct-horse" />
    </Field>
  );
}
