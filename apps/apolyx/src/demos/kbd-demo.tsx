"use client";

import { Kbd, KbdGroup } from "@altr/apolyx";

export default function KbdDemo() {
  return (
    <p className="text-sm text-muted-foreground">
      Press{" "}
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>{" "}
      to search, or <Kbd>F8</Kbd> to jump to notifications.
    </p>
  );
}
