"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export type PortalProps = {
  children: React.ReactNode;
  container?: HTMLElement | null;
};

export function Portal({ children, container }: PortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  const target = container ?? document.body;
  return createPortal(children, target);
}
