"use client";

import { ImageReel } from "@altr/apolyx";

const slide =
  (tone: string, label: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="var(--primary)"/><stop offset="100%" stop-color="var(--muted)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)" opacity="0.35"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="28" font-family="system-ui">${label}</text></svg>`,
  );

export default function Demo() {
  return (
    <ImageReel
      className="max-w-2xl"
      images={[
        { src: slide("a", "North"), alt: "North ridge", caption: "Fog on the ridge" },
        { src: slide("b", "Harbor"), alt: "Harbor lights", caption: "Evening harbor" },
        { src: slide("c", "Studio"), alt: "Studio desk", caption: "Morning studio" },
      ]}
    />
  );
}