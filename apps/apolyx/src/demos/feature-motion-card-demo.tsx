"use client";

import { FeatureMotionCard } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="flex w-full justify-center p-6">
      <FeatureMotionCard className="max-w-md w-full" href="#features" />
    </div>
  );
}