"use client";

import { Mail } from "lucide-react";
import { Button } from "@altr/apolyx";

export default function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="link">Link</Button>
      <Button loading>Saving</Button>
      <Button size="icon" aria-label="Send email">
        <Mail className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
