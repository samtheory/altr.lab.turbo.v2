"use client";

import { Input, Label } from "@altr/apolyx";

const types = [
  { type: "password", label: "Password", value: "correct-horse" },
  { type: "email", label: "Email", placeholder: "you@apolyx.dev" },
  { type: "tel", label: "Phone", placeholder: "+1 555 010 0199" },
  { type: "url", label: "Website", placeholder: "https://apolyx.dev" },
  { type: "number", label: "Seats", value: "12" },
  { type: "date", label: "Start date", value: "2026-10-14" },
  { type: "time", label: "Reminder", value: "09:30" },
  { type: "datetime-local", label: "Go-live", value: "2026-10-20T18:00" },
] as const;

export default function InputTypesDemo() {
  return (
    <div className="grid w-full max-w-xl gap-4 sm:grid-cols-2">
      {types.map((t) => (
        <div key={t.type} className="grid gap-1.5">
          <Label htmlFor={`type-${t.type}`}>
            {t.label} <span className="font-mono text-xs font-normal text-muted-foreground">{t.type}</span>
          </Label>
          <Input
            id={`type-${t.type}`}
            type={t.type}
            defaultValue={"value" in t ? t.value : undefined}
            placeholder={"placeholder" in t ? t.placeholder : undefined}
          />
        </div>
      ))}
    </div>
  );
}
