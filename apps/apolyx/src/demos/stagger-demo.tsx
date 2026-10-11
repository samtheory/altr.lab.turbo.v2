"use client";

import * as React from "react";
import { Button, Stagger, StaggerItem } from "@altr/apolyx";

const items = ["Tokens", "Primitives", "Components", "Motion", "Charts"];

export default function StaggerDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <Stagger key={key} as="ul" className="w-56 space-y-2">
        {items.map((item) => (
          <StaggerItem key={item} as="li" className="rounded-md border border-border px-3 py-2 text-sm">
            {item}
          </StaggerItem>
        ))}
      </Stagger>
      <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}>
        Replay
      </Button>
    </div>
  );
}
