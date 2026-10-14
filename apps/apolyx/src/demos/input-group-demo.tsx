"use client";

import { Search } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupInput, Kbd } from "@altr/apolyx";

export default function InputGroupDemo() {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search docs" aria-label="Search docs" />
      <InputGroupAddon align="inline-end">
        <Kbd>⌘K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}
