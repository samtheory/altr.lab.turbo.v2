"use client";

import { Badge, Marquee } from "@altr/apolyx";

export default function Demo() {
  return (
    <Marquee pauseOnHover className="max-w-md" duration={24}>
      {["Motion", "Tokens", "Charts", "CLI", "A11y", "Storybook"].map((w) => (
        <Badge key={w} variant="secondary">
          {w}
        </Badge>
      ))}
    </Marquee>
  );
}