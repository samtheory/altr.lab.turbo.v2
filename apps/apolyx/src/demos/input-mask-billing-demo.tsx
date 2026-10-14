"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import {
  detectCardBrand,
  Field,
  InputGroupAddon,
  MaskedInput,
  masks,
  type CardBrand,
} from "@altr/apolyx";

const BRAND_LABEL: Record<CardBrand, string | null> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  unknown: null,
};

export default function InputMaskBillingDemo() {
  const [card, setCard] = React.useState("");
  const brand = detectCardBrand(card);
  const label = BRAND_LABEL[brand];

  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field label="Card number">
        <InputGroupAddon>
          <CreditCard />
        </InputGroupAddon>
        <MaskedInput
          mask={masks.card}
          value={card}
          onValueChange={setCard}
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
        />
        {label ? (
          <InputGroupAddon align="inline-end">
            <span
              data-brand={brand}
              className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
          </InputGroupAddon>
        ) : null}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Expiry">
          <MaskedInput mask={masks.expiry} autoComplete="cc-exp" placeholder="MM/YY" />
        </Field>
        <Field label="CVC" description={brand === "amex" ? "4 digits on the front." : "3 digits on the back."}>
          <MaskedInput mask={masks.cvc} autoComplete="cc-csc" placeholder={brand === "amex" ? "1234" : "123"} />
        </Field>
      </div>
    </div>
  );
}
