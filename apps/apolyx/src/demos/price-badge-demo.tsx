"use client";

import { PriceBadge } from "@altr/apolyx";

export default function PriceBadgeDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <PriceBadge values={["$17.38", "$3.15", "$35.99", "Free"]} />
      <PriceBadge variant="success" values={["$19", "$29", "$39"]} interval={1600} />
      <PriceBadge variant="outline" value="€12.00" compareAt="€18" />
    </div>
  );
}
