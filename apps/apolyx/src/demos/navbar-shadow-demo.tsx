"use client";

import { NavbarShadow } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="w-full">
      <NavbarShadow />
      <div className="mx-auto max-w-2xl space-y-4 p-8 text-muted-foreground">
        {Array.from({ length: 6 }).map((_, i) => (
          <p key={i}>
            Scroll to see the sticky navbar hold position. Links and CTA stay keyboard focusable.
          </p>
        ))}
      </div>
    </div>
  );
}