"use client";

import * as React from "react";

import { computePosition, type Align, type Side } from "./position";

export type UseFloatingOptions = {
  anchorRef: React.RefObject<HTMLElement | null>;
  floatingRef: React.RefObject<HTMLElement | null>;
  side?: Side;
  align?: Align;
  offset?: number;
  enabled?: boolean;
};

/** Fixed-position coordinates for floating content anchored to an element. */
export function useFloating({
  anchorRef,
  floatingRef,
  side = "bottom",
  align = "center",
  offset = 8,
  enabled = true,
}: UseFloatingOptions) {
  const [position, setPosition] = React.useState<{
    x: number;
    y: number;
    side: Side;
  } | null>(null);

  React.useLayoutEffect(() => {
    if (!enabled) return;
    const update = () => {
      const anchor = anchorRef.current;
      const floating = floatingRef.current;
      if (!anchor || !floating) return;
      setPosition(
        computePosition({
          anchor: anchor.getBoundingClientRect(),
          floating: {
            width: floating.offsetWidth,
            height: floating.offsetHeight,
          },
          side,
          align,
          offset,
        }),
      );
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (floatingRef.current) observer?.observe(floatingRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [anchorRef, floatingRef, side, align, offset, enabled]);

  const style: React.CSSProperties = {
    position: "fixed",
    left: position?.x ?? 0,
    top: position?.y ?? 0,
  };
  // Opacity (not visibility) so content can take focus before the first measure.
  if (!position) style.opacity = 0;

  return { style, side: position?.side ?? side };
}
