export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";

export type PositionInput = {
  anchor: DOMRect;
  floating: { width: number; height: number };
  side?: Side;
  align?: Align;
  offset?: number;
  padding?: number;
  viewport?: { width: number; height: number };
};

export type PositionResult = {
  x: number;
  y: number;
  side: Side;
};

function alignMain(
  anchorStart: number,
  anchorSize: number,
  floatSize: number,
  align: Align,
) {
  if (align === "start") return anchorStart;
  if (align === "end") return anchorStart + anchorSize - floatSize;
  return anchorStart + (anchorSize - floatSize) / 2;
}

export function computePosition({
  anchor,
  floating,
  side = "bottom",
  align = "center",
  offset = 8,
  padding = 8,
  viewport = {
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  },
}: PositionInput): PositionResult {
  const trySide = (s: Side): PositionResult => {
    let x = 0;
    let y = 0;
    if (s === "bottom") {
      x = alignMain(anchor.left, anchor.width, floating.width, align);
      y = anchor.bottom + offset;
    } else if (s === "top") {
      x = alignMain(anchor.left, anchor.width, floating.width, align);
      y = anchor.top - floating.height - offset;
    } else if (s === "right") {
      x = anchor.right + offset;
      y = alignMain(anchor.top, anchor.height, floating.height, align);
    } else {
      x = anchor.left - floating.width - offset;
      y = alignMain(anchor.top, anchor.height, floating.height, align);
    }
    x = Math.min(
      Math.max(padding, x),
      viewport.width - floating.width - padding,
    );
    y = Math.min(
      Math.max(padding, y),
      viewport.height - floating.height - padding,
    );
    return { x, y, side: s };
  };

  const initial = trySide(side);
  const overflows =
    (side === "bottom" && anchor.bottom + offset + floating.height > viewport.height - padding) ||
    (side === "top" && anchor.top - offset - floating.height < padding) ||
    (side === "right" && anchor.right + offset + floating.width > viewport.width - padding) ||
    (side === "left" && anchor.left - offset - floating.width < padding);

  if (!overflows) return initial;

  const flip: Record<Side, Side> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  };
  return trySide(flip[side]);
}
