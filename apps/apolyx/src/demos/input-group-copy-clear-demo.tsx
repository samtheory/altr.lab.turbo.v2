"use client";

import * as React from "react";
import { Check, Copy, Search, X } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@altr/apolyx";

function CopyField() {
  const value = "https://apolyx.dev/invite/7f3k2";
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <InputGroup>
      <InputGroupInput readOnly value={value} aria-label="Invite link" className="font-mono text-xs" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={copied ? "Copied" : "Copy link"}
          onClick={async () => {
            await navigator.clipboard?.writeText(value).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function ClearField() {
  const [query, setQuery] = React.useState("design tokens");
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        aria-label="Search"
      />
      {query ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              ref.current?.focus();
            }}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}

export default function InputGroupCopyClearDemo() {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <CopyField />
      <ClearField />
    </div>
  );
}
