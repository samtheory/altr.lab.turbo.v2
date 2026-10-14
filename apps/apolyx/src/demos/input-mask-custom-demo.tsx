"use client";

import * as React from "react";
import { Field, InputGroupAddon, MaskedInput, type MaskSource } from "@altr/apolyx";

const HEX = { H: /[0-9a-fA-F]/ };

const ORDER_ID: MaskSource = (raw) => (/^\d/.test(raw) ? "9999-9999" : "aa-99999");

export default function InputMaskCustomDemo() {
  const [hex, setHex] = React.useState("6d5efc");

  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Brand color" description="Custom token H matches one hex digit.">
        <InputGroupAddon>
          <span
            aria-hidden
            className="size-4 rounded-sm border border-border"
            style={{ background: hex.length === 6 ? `#${hex}` : "transparent" }}
          />
        </InputGroupAddon>
        <MaskedInput mask={"\\#HHHHHH"} tokens={HEX} value={hex} onValueChange={setHex} className="font-mono" />
      </Field>
      <Field label="License key" description="* matches a letter or digit.">
        <MaskedInput mask="****-****-****" className="font-mono uppercase" />
      </Field>
      <Field label="Order ID" description="Starts with digits for web orders, letters for store orders.">
        <MaskedInput mask={ORDER_ID} className="font-mono" />
      </Field>
    </div>
  );
}
