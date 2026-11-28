"use client";

import { ImageCompare } from "@altr/apolyx";

const before =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="color-mix(in oklch, var(--muted) 80%, var(--background))"/><text x="50%" y="50%" text-anchor="middle" font-size="20" fill="var(--foreground)" font-family="system-ui">Before</text></svg>`,
  );

const after =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="100%" height="100%" fill="color-mix(in oklch, var(--primary) 25%, var(--card))"/><text x="50%" y="50%" text-anchor="middle" font-size="20" fill="var(--foreground)" font-family="system-ui">After</text></svg>`,
  );

export default function Demo() {
  return (
    <div className="w-full max-w-xl space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag the handle or focus it and use arrow keys (Shift for larger steps).
      </p>
      <ImageCompare beforeSrc={before} afterSrc={after} altBefore="Before state" altAfter="After state" initial={45} />
    </div>
  );
}