"use client";

import { ClipVideoText } from "@altr/apolyx";

const DEMO_SRC =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm";

export default function Demo() {
  return (
    <ClipVideoText
      className="text-5xl md:text-6xl"
      src={DEMO_SRC}
      poster="/apolyx-logo.png"
    >
      Apolyx
    </ClipVideoText>
  );
}