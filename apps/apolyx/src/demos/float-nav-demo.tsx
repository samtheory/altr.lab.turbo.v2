"use client";

import * as React from "react";
import { Button, FloatNav, FloatNavAction, FloatNavItem } from "@altr/apolyx";

export default function FloatNavDemo() {
  const [visible, setVisible] = React.useState(true);

  return (
    <div className="relative h-64 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-muted/20">
      <FloatNav visible={visible} className="!absolute !top-3">
        <FloatNavItem href="#home" active>
          Home
        </FloatNavItem>
        <FloatNavItem href="#products">Products</FloatNavItem>
        <FloatNavItem href="#pricing">Pricing</FloatNavItem>
        <FloatNavAction type="button">Login</FloatNavAction>
      </FloatNav>
      <div className="flex h-full flex-col items-center justify-end gap-2 p-4 pb-6">
        <p className="text-center text-xs text-muted-foreground">
          Demo uses controlled visibility — on pages, scroll hides/reveals the bar.
        </p>
        <Button size="sm" variant="outline" onClick={() => setVisible((v) => !v)}>
          {visible ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}
