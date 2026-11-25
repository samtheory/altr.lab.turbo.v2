"use client";

import { AvatarGroup } from "@altr/apolyx";

export default function AvatarGroupDemo() {
  return (
    <AvatarGroup
      people={[
        { initials: "MT", name: "Mina" },
        { initials: "AC", name: "Ava" },
        { initials: "SL", name: "Sam" },
        { initials: "JN", name: "Jordan" },
      ]}
      moreLabel="+3"
      caption="7 people editing"
    />
  );
}
