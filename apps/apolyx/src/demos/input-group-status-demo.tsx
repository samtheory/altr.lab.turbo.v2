"use client";

import { CircleCheck, Search, TriangleAlert } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Spinner,
} from "@altr/apolyx";

export default function InputGroupStatusDemo() {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <InputGroup>
        <InputGroupInput defaultValue="ada-lovelace" aria-label="Checking username" />
        <InputGroupAddon align="inline-end">
          <Spinner label="Checking availability" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput defaultValue="ada-l" aria-label="Available username" />
        <InputGroupAddon align="inline-end" className="text-success">
          <CircleCheck />
          <span className="text-xs font-medium">Available</span>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput defaultValue="button" aria-label="Search" />
        <InputGroupAddon align="inline-end">
          <InputGroupText className="tabular-nums">12 results</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput defaultValue="ada@" aria-label="Invalid email" aria-invalid />
        <InputGroupAddon align="inline-end" className="text-destructive">
          <TriangleAlert />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput defaultValue="apolyx.dev" aria-label="Locked site" disabled />
      </InputGroup>
    </div>
  );
}
