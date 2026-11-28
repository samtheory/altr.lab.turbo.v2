"use client";

import { ParallaxGallery } from "@altr/apolyx";

const PLACE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420"><rect width="100%" height="100%" fill="hsl(var(--muted))"/></svg>`,
  );

const shots = Array.from({ length: 9 }, (_, i) => ({
  src: PLACE,
  alt: `Gallery frame ${i + 1}`,
}));

export default function Demo() {
  return (
    <ParallaxGallery
      className="max-w-2xl"
      columns={3}
      images={shots.map((s, i) => ({
        ...s,
        alt: `Frame ${i + 1}`,
      }))}
    />
  );
}