"use client";

import { AvatarStatus } from "@altr/apolyx";

export default function AvatarStatusDemo() {
  return (
    <div className="flex items-center gap-4">
      <AvatarStatus status="online" fallback="ON" />
      <AvatarStatus status="away" fallback="AW" pulse={false} />
      <AvatarStatus status="busy" fallback="BZ" pulse={false} />
      <AvatarStatus status="offline" fallback="OF" pulse={false} />
    </div>
  );
}
