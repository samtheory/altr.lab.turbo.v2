"use client";

import { Button, StatusButton, buttonTones } from "@altr/apolyx";

function Row({ variant }: { variant: "status" | "status-inset" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttonTones.map((tone) => (
        <StatusButton key={tone} tone={tone} variant={variant} />
      ))}
    </div>
  );
}

export default function ButtonStatusDemo() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Tinted face</p>
        <div className="dark rounded-xl bg-background p-4">
          <Row variant="status" />
        </div>
        <Row variant="status" />
      </div>
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">Inner border in the face color</p>
        <div className="dark rounded-xl bg-background p-4">
          <Row variant="status-inset" />
        </div>
        <Row variant="status-inset" />
      </div>
      <div>
        <Button variant="status" tone="success" size="sm">
          Custom label
        </Button>
      </div>
    </div>
  );
}
