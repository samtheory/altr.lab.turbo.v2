"use client";

import * as React from "react";

export type PresenceProps = {
  present: boolean;
  children: React.ReactElement | ((props: { present: boolean }) => React.ReactElement);
  onExitComplete?: () => void;
};

/**
 * Keeps children mounted while exit animations run.
 * Child may call `onExitComplete` via a data callback or Motion `onAnimationComplete`.
 */
export function Presence({ present, children, onExitComplete }: PresenceProps) {
  const [mounted, setMounted] = React.useState(present);
  const prev = React.useRef(present);

  React.useEffect(() => {
    if (present) {
      setMounted(true);
      prev.current = true;
      return;
    }
    if (prev.current && !present) {
      const timer = window.setTimeout(() => {
        setMounted(false);
        onExitComplete?.();
      }, 200);
      prev.current = false;
      return () => window.clearTimeout(timer);
    }
  }, [present, onExitComplete]);

  if (!mounted) return null;

  if (typeof children === "function") {
    return children({ present });
  }
  return children;
}
