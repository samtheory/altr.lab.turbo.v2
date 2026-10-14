"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Button,
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@altr/apolyx";

const order = [
  { step: 1, date: "Mar 15", title: "Order placed", body: "We received your order." },
  { step: 2, date: "Mar 16", title: "Payment confirmed", body: "Preparing your package for shipment." },
  { step: 3, date: "Mar 18", title: "Shipped", body: "Your package is on its way." },
  { step: 4, date: "Mar 20", title: "Delivered", body: "Left at the front desk." },
];

export default function TimelineProgressDemo() {
  const [value, setValue] = React.useState(2);
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Timeline value={value} size="lg" aria-label="Order status">
        {order.map((o) => (
          <TimelineItem key={o.step} step={o.step}>
            <TimelineSeparator />
            <TimelineIndicator>
              {o.step <= value ? <Check strokeWidth={3} /> : null}
            </TimelineIndicator>
            <TimelineHeader>
              <TimelineTitle>{o.title}</TimelineTitle>
              <TimelineDate>{o.date}</TimelineDate>
            </TimelineHeader>
            <TimelineContent>{o.body}</TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={value === 0}
          onClick={() => setValue((v) => Math.max(0, v - 1))}
        >
          Back
        </Button>
        <Button
          size="sm"
          disabled={value === order.length}
          onClick={() => setValue((v) => Math.min(order.length, v + 1))}
        >
          Advance
        </Button>
      </div>
    </div>
  );
}
