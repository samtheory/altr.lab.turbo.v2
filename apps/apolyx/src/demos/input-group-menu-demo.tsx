"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@altr/apolyx";

const scopes = ["All", "Docs", "Components", "Issues"];

export default function InputGroupMenuDemo() {
  const [scope, setScope] = React.useState("All");
  return (
    <InputGroup className="max-w-sm">
      <InputGroupAddon>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <InputGroupButton aria-label={`Search scope: ${scope}`}>
              {scope} <ChevronDown />
            </InputGroupButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value={scope} onValueChange={setScope}>
              {scopes.map((s) => (
                <DropdownMenuRadioItem key={s} value={s}>
                  {s}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </InputGroupAddon>
      <InputGroupInput placeholder={`Search ${scope.toLowerCase()}…`} aria-label="Search" />
    </InputGroup>
  );
}
