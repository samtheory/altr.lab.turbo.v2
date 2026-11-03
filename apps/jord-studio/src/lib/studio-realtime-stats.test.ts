import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatLastEventAge,
  isRealtimeIdle,
  liveLastEventAgeMs,
  normalizeRealtimeStats,
  topTables,
} from "./studio-realtime-stats.js";

describe("studio realtime stats S0086", () => {
  it("normalises the contract and defends against junk", () => {
    const s = normalizeRealtimeStats({
      version: 1,
      generated_at: 10,
      subscribers: 3,
      eventsPerMin: 12,
      lastEventAt: 5,
      lastEventAgeMs: 5000,
      tables: [{ table: "a", events: 2 }, { table: "", events: 1 }, { events: 9 }, null],
    });
    assert.deepEqual(s?.tables, [{ table: "a", events: 2 }]);
    assert.equal(s?.subscribers, 3);
    const bad = normalizeRealtimeStats({ subscribers: -4, eventsPerMin: "x", tables: "no" });
    assert.equal(bad?.subscribers, 0);
    assert.equal(bad?.eventsPerMin, 0);
    assert.equal(bad?.lastEventAt, null);
    assert.deepEqual(bad?.tables, []);
    assert.equal(normalizeRealtimeStats(null), null);
    assert.equal(normalizeRealtimeStats([]), null);
  });

  it("detects the empty state and ranks top tables", () => {
    assert.equal(isRealtimeIdle(normalizeRealtimeStats({})!), true);
    const s = normalizeRealtimeStats({
      subscribers: 1,
      tables: [{ table: "a", events: 1 }, { table: "b", events: 5 }, { table: "c", events: 1 }],
    })!;
    assert.equal(isRealtimeIdle(s), false);
    assert.deepEqual(topTables(s, 2).map((t) => t.table), ["b", "a"]);
  });

  it("ticks the last-event age client side and formats it", () => {
    const s = normalizeRealtimeStats({ lastEventAt: 1, lastEventAgeMs: 4000 })!;
    assert.equal(liveLastEventAgeMs(s, 1000, 3500), 6500);
    assert.equal(liveLastEventAgeMs(s, 1000, 500), 4000);
    assert.equal(liveLastEventAgeMs(normalizeRealtimeStats({})!, 0, 10), null);
    assert.equal(formatLastEventAge(null), "never");
    assert.equal(formatLastEventAge(400), "just now");
    assert.equal(formatLastEventAge(6500), "6s ago");
    assert.equal(formatLastEventAge(125_000), "2m ago");
    assert.equal(formatLastEventAge(7_300_000), "2h ago");
    assert.equal(formatLastEventAge(172_800_000), "2d ago");
  });
});
