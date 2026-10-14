"use client";

import * as React from "react";
import { Check, ChevronDown, Copy, Globe, Lock, Search, Send, Users } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  toast,
} from "@altr/apolyx";

function Picker({
  label,
  value,
  options,
  onChange,
  icon,
  className,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <InputGroupButton aria-label={`${label}: ${value}`} className={className}>
          {icon}
          {value}
          <ChevronDown />
        </InputGroupButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o} value={o}>
              {o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const methodColor: Record<string, string> = {
  GET: "text-success",
  POST: "text-info",
  PUT: "text-warning",
  DELETE: "text-destructive",
};

function ApiRequest() {
  const [method, setMethod] = React.useState("GET");
  return (
    <InputGroup>
      <InputGroupAddon>
        <Picker
          label="Method"
          value={method}
          options={["GET", "POST", "PUT", "DELETE"]}
          onChange={setMethod}
          className={`font-mono font-semibold ${methodColor[method]}`}
        />
      </InputGroupAddon>
      <InputGroupInput
        defaultValue="https://api.apolyx.dev/v1/projects"
        aria-label="Request URL"
        className="font-mono text-xs"
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="default" onClick={() => toast(`${method} sent`)}>
          <Send /> Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function ShareLink() {
  const [visibility, setVisibility] = React.useState("Team");
  const [copied, setCopied] = React.useState(false);
  const icon = visibility === "Public" ? <Globe /> : visibility === "Team" ? <Users /> : <Lock />;
  return (
    <InputGroup>
      <InputGroupAddon>
        <Picker
          label="Visibility"
          value={visibility}
          options={["Private", "Team", "Public"]}
          onChange={setVisibility}
          icon={icon}
        />
      </InputGroupAddon>
      <InputGroupInput readOnly value="apolyx.dev/s/q8r2" aria-label="Share link" className="font-mono text-xs" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={copied ? "Copied" : "Copy link"}
          onClick={() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="text-success" /> : <Copy />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function OrderSearch() {
  const [status, setStatus] = React.useState("Any status");
  return (
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="Order # or customer" aria-label="Search orders" />
      <InputGroupAddon align="inline-end">
        <Picker
          label="Status"
          value={status}
          options={["Any status", "Paid", "Pending", "Refunded"]}
          onChange={setStatus}
        />
      </InputGroupAddon>
    </InputGroup>
  );
}

function MemberRow() {
  const [role, setRole] = React.useState("Editor");
  return (
    <InputGroup>
      <InputGroupAddon>
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">GH</AvatarFallback>
        </Avatar>
      </InputGroupAddon>
      <InputGroupInput defaultValue="grace@apolyx.dev" aria-label="Member email" />
      <InputGroupAddon align="inline-end">
        <Picker label="Role" value={role} options={["Viewer", "Editor", "Admin"]} onChange={setRole} />
      </InputGroupAddon>
    </InputGroup>
  );
}

export default function InputGroupRealWorldDemo() {
  return (
    <div className="grid w-full max-w-lg gap-3">
      <ApiRequest />
      <ShareLink />
      <OrderSearch />
      <MemberRow />
    </div>
  );
}
