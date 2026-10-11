/** Mirrors CSS motion tokens from theme files (phase 2). */
export const durations = {
  fast: 0.12,
  base: 0.2,
  slow: 0.4,
} as const;

export const easings = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.45, 0, 0.55, 1] as const,
  spring: { type: "spring" as const, stiffness: 420, damping: 28 },
};
