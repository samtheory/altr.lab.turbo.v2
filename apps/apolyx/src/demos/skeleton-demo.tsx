"use client";

import { Skeleton } from "@altr/apolyx";

export default function SkeletonDemo() {
  return (
    <div className="flex items-center gap-4" aria-busy="true" aria-label="Loading profile">
      <Skeleton className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
