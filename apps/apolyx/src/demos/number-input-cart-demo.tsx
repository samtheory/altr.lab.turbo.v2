"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { Button, NumberInput } from "@altr/apolyx";

const items = [
  { id: "keys", name: "Hardware key", price: 49 },
  { id: "stickers", name: "Sticker pack", price: 6 },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function NumberInputCartDemo() {
  const [qty, setQty] = React.useState<Record<string, number>>({ keys: 2, stickers: 5 });
  const visible = items.filter((i) => (qty[i.id] ?? 0) > 0);
  const total = visible.reduce((sum, i) => sum + i.price * (qty[i.id] ?? 0), 0);
  return (
    <div className="w-full max-w-md divide-y rounded-lg border bg-card">
      {visible.map((item) => (
        <div key={item.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{usd.format(item.price)} each</p>
          </div>
          <NumberInput
            aria-label={`${item.name} quantity`}
            size="sm"
            className="w-28"
            min={1}
            max={20}
            value={qty[item.id]}
            onValueChange={(v) => setQty((q) => ({ ...q, [item.id]: v ?? 1 }))}
          />
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Remove ${item.name}`}
            onClick={() => setQty((q) => ({ ...q, [item.id]: 0 }))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold tabular-nums">{usd.format(total)}</span>
      </div>
    </div>
  );
}
