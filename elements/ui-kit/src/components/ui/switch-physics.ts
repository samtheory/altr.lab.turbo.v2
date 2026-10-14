/**
 * Pure Switch thumb geometry. `switch.tsx` feeds pointer state in and writes the
 * result to motion values, so every limit here is unit-testable without animation.
 *
 * Coordinates are px inside the track's padding box, measured from the thumb's
 * resting offset: the thumb's left edge sits at 0 when off and at `travel` when on.
 */

export type SwitchSize = "sm" | "md" | "lg";

export type SwitchGeometry = {
  /** Thumb width and height. */
  thumb: number;
  /** Distance the thumb's left edge moves between off and on. */
  travel: number;
  /** Stretch reached by a press with no movement. */
  pressStretch: number;
  /** Hard cap on stretch in every path. */
  maxStretch: number;
};

const sizes: Record<SwitchSize, { thumb: number; travel: number }> = {
  sm: { thumb: 16, travel: 14 },
  md: { thumb: 20, travel: 18 },
  lg: { thumb: 24, travel: 22 },
};

export function getSwitchGeometry(size: SwitchSize, travel?: number): SwitchGeometry {
  const s = sizes[size];
  return {
    thumb: s.thumb,
    travel: travel ?? s.travel,
    pressStretch: Math.round(s.thumb * 0.2),
    maxStretch: Math.round(s.thumb * 0.3),
  };
}

/** Speed (px/ms) to stretch (px) gain. */
export const SPEED_GAIN = 6;
/** Exponential smoothing factor for pointer speed. */
export const SPEED_SMOOTHING = 0.35;
/** Movement the other way (px) before the drag direction flips. */
export const DIRECTION_HYSTERESIS = 2;
/** Pointer movement (px) under which a press counts as a click. */
export const DRAG_THRESHOLD = 3;

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export type ThumbInput = {
  /** Where the thumb's left edge would be if it followed the pointer exactly. */
  desired: number;
  /** Smoothed pointer speed in px/ms (sign ignored). */
  velocity: number;
  /** Direction of motion; stretch grows on this side. */
  dir: 1 | -1;
  /** Press progress 0..1 (animated in by the component). Defaults to 1. */
  press?: number;
  /** Disables stretch and squash (reduced motion). */
  rigid?: boolean;
  geometry: SwitchGeometry;
};

export type ThumbLayout = {
  /** Thumb left edge. */
  left: number;
  /** Thumb width. */
  width: number;
  /** 0 at the off end, 1 at the on end. */
  progress: number;
};

/** Squash and offset (≤ 2 px each) for a pointer `over` px beyond the rail. */
export function wallSquash(over: number) {
  return (2 * over) / (over + 12);
}

export function computeThumb({
  desired,
  velocity,
  dir,
  press = 1,
  rigid = false,
  geometry: g,
}: ThumbInput): ThumbLayout {
  const pos = clamp(desired, 0, g.travel);
  const progress = g.travel > 0 ? pos / g.travel : 0;

  if (rigid) return { left: pos, width: g.thumb, progress };

  if (desired < 0 || desired > g.travel) {
    // Past an end: no growth. The outer edge stays on the wall and the thumb squashes toward it.
    const squash = wallSquash(desired < 0 ? -desired : desired - g.travel);
    const width = g.thumb - squash;
    return { left: desired < 0 ? 0 : g.travel + squash, width, progress };
  }

  const raw = clamp(
    g.pressStretch * clamp(press, 0, 1) + Math.abs(velocity) * SPEED_GAIN,
    0,
    g.maxStretch,
  );
  // Taper to nothing over the last half-thumb before the end being approached,
  // so the thumb arrives at its normal width and never pushes into a wall.
  const ahead = dir > 0 ? g.travel - pos : pos;
  const stretch = raw * clamp(ahead / (g.thumb / 2), 0, 1);

  return {
    left: dir > 0 ? pos : pos - stretch,
    width: g.thumb + stretch,
    progress,
  };
}

export type PointerTrack = {
  lastX: number;
  lastT: number;
  /** Smoothed speed magnitude, px/ms. */
  velocity: number;
  dir: 1 | -1;
  /** Furthest point reached in the current direction (hysteresis anchor). */
  pivot: number;
};

export function startPointerTrack(x: number, t: number, dir: 1 | -1): PointerTrack {
  return { lastX: x, lastT: t, velocity: 0, dir, pivot: x };
}

/** Advance pointer tracking: smoothed speed plus direction with hysteresis. */
export function stepPointerTrack(
  prev: PointerTrack,
  x: number,
  t: number,
  decayedVelocity = prev.velocity,
): PointerTrack {
  const dt = t - prev.lastT;
  const speed = dt > 0 ? Math.abs(x - prev.lastX) / dt : decayedVelocity;
  const velocity = decayedVelocity + SPEED_SMOOTHING * (speed - decayedVelocity);

  let { dir, pivot } = prev;
  if (dir > 0) {
    if (x > pivot) pivot = x;
    else if (pivot - x >= DIRECTION_HYSTERESIS) {
      dir = -1;
      pivot = x;
    }
  } else if (x < pivot) pivot = x;
  else if (x - pivot >= DIRECTION_HYSTERESIS) {
    dir = 1;
    pivot = x;
  }

  return { lastX: x, lastT: t, velocity, dir, pivot };
}
