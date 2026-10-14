"use client";

import { AtSign, Mail, MapPin, Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@altr/apolyx";

export default function InputGroupAddonsDemo() {
  return (
    <div className="grid w-full max-w-md gap-3 sm:grid-cols-2">
      <InputGroup>
        <InputGroupAddon>
          <Mail />
        </InputGroupAddon>
        <InputGroupInput placeholder="Icon start" aria-label="Email" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Icon end" aria-label="Location" />
        <InputGroupAddon align="inline-end">
          <MapPin />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Both sides" aria-label="Handle" />
        <InputGroupAddon align="inline-end">
          <AtSign />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="apolyx.dev" aria-label="Website" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="72" aria-label="Weight" inputMode="decimal" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>kg</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="0.00" aria-label="Price" inputMode="decimal" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>USD</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
