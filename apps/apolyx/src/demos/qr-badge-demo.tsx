"use client";

import { QrBadge, toast } from "@altr/apolyx";

export default function QrBadgeDemo() {
  return (
    <div className="flex w-full items-center justify-center py-2">
      <QrBadge label="Get the app" onClick={() => toast("Open app link")} />
    </div>
  );
}
