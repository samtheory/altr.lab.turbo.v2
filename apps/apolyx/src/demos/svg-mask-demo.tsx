"use client";

import { SvgMask } from "@altr/apolyx";

export default function SvgMaskDemo() {
  return (
    <SvgMask className="w-full max-w-md">
      <h3 className="text-xl font-semibold">Masked headline</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Content appears through a circular spotlight that tracks your pointer.
      </p>
    </SvgMask>
  );
}