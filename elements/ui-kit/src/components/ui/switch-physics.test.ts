import { describe, expect, it } from "vitest";

import {
  DIRECTION_HYSTERESIS,
  computeThumb,
  getSwitchGeometry,
  startPointerTrack,
  stepPointerTrack,
  type SwitchSize,
} from "./switch-physics";

const sizes: SwitchSize[] = ["sm", "md", "lg"];

describe("getSwitchGeometry", () => {
  it("derives press and max stretch from the thumb (20% / 30%)", () => {
    expect(getSwitchGeometry("sm")).toMatchObject({ thumb: 16, pressStretch: 3, maxStretch: 5 });
    expect(getSwitchGeometry("md")).toMatchObject({ thumb: 20, pressStretch: 4, maxStretch: 6 });
    expect(getSwitchGeometry("lg")).toMatchObject({ thumb: 24, pressStretch: 5, maxStretch: 7 });
  });

  it("accepts a measured travel", () => {
    expect(getSwitchGeometry("md", 40).travel).toBe(40);
  });
});

describe("computeThumb", () => {
  it("never exceeds thumb + maxStretch across a full sweep", () => {
    for (const size of sizes) {
      const g = getSwitchGeometry(size);
      for (let desired = -40; desired <= g.travel + 40; desired += 0.5) {
        for (const dir of [1, -1] as const) {
          for (const velocity of [0, 0.5, 1, 2, 5]) {
            const r = computeThumb({ desired, velocity, dir, geometry: g });
            expect(r.width).toBeLessThanOrEqual(g.thumb + g.maxStretch + 1e-9);
            // The stretched box stays inside the rail.
            expect(r.left).toBeGreaterThanOrEqual(-1e-9);
            expect(r.left + r.width).toBeLessThanOrEqual(g.travel + g.thumb + 1e-9);
          }
        }
      }
    }
  });

  it("does not grow when pushed into the side it rests on", () => {
    for (const size of sizes) {
      const g = getSwitchGeometry(size);
      for (const desired of [-1, -5, -20, -80]) {
        for (const velocity of [0, 3]) {
          const r = computeThumb({ desired, velocity, dir: -1, geometry: g });
          expect(r.width).toBeLessThanOrEqual(g.thumb);
          expect(r.left).toBe(0);
        }
      }
    }
  });

  it("squashes at most 2px past the far end and stays near the wall", () => {
    for (const size of sizes) {
      const g = getSwitchGeometry(size);
      for (const over of [1, 5, 20, 200]) {
        const r = computeThumb({ desired: g.travel + over, velocity: 4, dir: 1, geometry: g });
        expect(r.width).toBeLessThanOrEqual(g.thumb);
        expect(r.width).toBeGreaterThanOrEqual(g.thumb - 2);
        expect(r.left).toBeLessThanOrEqual(g.travel + 2);
        expect(r.left + r.width).toBeCloseTo(g.travel + g.thumb);
      }
    }
  });

  it("arrives at normal width at the end being approached", () => {
    for (const size of sizes) {
      const g = getSwitchGeometry(size);
      expect(computeThumb({ desired: g.travel, velocity: 0, dir: 1, geometry: g }).width).toBe(
        g.thumb,
      );
      expect(computeThumb({ desired: 0, velocity: 0, dir: -1, geometry: g }).width).toBe(g.thumb);
    }
  });

  it("press stretches toward the target, anchored on the resting edge", () => {
    const g = getSwitchGeometry("md");
    const off = computeThumb({ desired: 0, velocity: 0, dir: 1, geometry: g });
    expect(off).toMatchObject({ left: 0, width: g.thumb + g.pressStretch });
    const on = computeThumb({ desired: g.travel, velocity: 0, dir: -1, geometry: g });
    expect(on.left + on.width).toBe(g.travel + g.thumb);
    expect(on.width).toBe(g.thumb + g.pressStretch);
    const unpressed = computeThumb({ desired: 0, velocity: 0, dir: 1, press: 0, geometry: g });
    expect(unpressed.width).toBe(g.thumb);
  });

  it("is rigid under reduced motion", () => {
    const g = getSwitchGeometry("md");
    const r = computeThumb({ desired: 9, velocity: 5, dir: 1, rigid: true, geometry: g });
    expect(r).toEqual({ left: 9, width: g.thumb, progress: 0.5 });
  });

  it("reports progress from 0 to 1", () => {
    const g = getSwitchGeometry("md");
    expect(computeThumb({ desired: -5, velocity: 0, dir: 1, geometry: g }).progress).toBe(0);
    expect(computeThumb({ desired: g.travel / 2, velocity: 0, dir: 1, geometry: g }).progress).toBe(
      0.5,
    );
    expect(computeThumb({ desired: 99, velocity: 0, dir: 1, geometry: g }).progress).toBe(1);
  });
});

describe("pointer tracking", () => {
  it("smooths speed instead of jumping to it", () => {
    const t0 = startPointerTrack(0, 0, 1);
    const t1 = stepPointerTrack(t0, 10, 5);
    expect(t1.velocity).toBeGreaterThan(0);
    expect(t1.velocity).toBeLessThan(2);
  });

  it("flips direction only after the hysteresis distance", () => {
    let t = startPointerTrack(0, 0, 1);
    t = stepPointerTrack(t, 10, 10);
    t = stepPointerTrack(t, 10 - (DIRECTION_HYSTERESIS - 1), 20);
    expect(t.dir).toBe(1);
    t = stepPointerTrack(t, 10 - DIRECTION_HYSTERESIS, 30);
    expect(t.dir).toBe(-1);
  });
});
