"use client";

import { Globe } from "lucide-react";
import {
  Field,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@altr/apolyx";

export default function InputGroupFieldDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Website" description="Your public site.">
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="apolyx.dev" />
      </Field>
      <Field label="Custom domain" layout="floating" error="DNS record not found yet.">
        <InputGroupAddon>
          <Globe />
        </InputGroupAddon>
        <InputGroupInput defaultValue="docs.altr.lab" />
      </Field>
    </div>
  );
}
