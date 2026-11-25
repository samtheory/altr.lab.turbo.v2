"use client";

import { SoundRing } from "@altr/apolyx";

export default function SoundRingDemo() {
  return (
    <div className="flex justify-center p-4">
      <SoundRing size={220} className="text-primary" />
    </div>
  );
}
