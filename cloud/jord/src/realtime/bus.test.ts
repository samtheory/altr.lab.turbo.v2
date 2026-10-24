import { describe, expect, it } from "vitest";

import { RealtimeBus } from "./bus.js";
import { MAX_REALTIME_SUBSCRIBERS, type JordChangeEvent } from "./types.js";

function sample(id = "row-1"): JordChangeEvent {
  return {
    type: "jord.change",
    table: "records",
    op: "insert",
    id,
    version: 1,
    at: 1,
    dialect: "libsql",
  };
}

describe("RealtimeBus", () => {
  it("delivers a published change and ignores listener throws", () => {
    const bus = new RealtimeBus();
    const seen: string[] = [];
    bus.trySubscribe(() => {
      throw new Error("boom");
    });
    bus.trySubscribe((event) => {
      seen.push(event.id);
    });
    bus.publish(sample("a"));
    expect(seen).toEqual(["a"]);
  });

  it("returns null once the subscriber cap is reached", () => {
    const bus = new RealtimeBus();
    for (let i = 0; i < MAX_REALTIME_SUBSCRIBERS; i++) {
      expect(bus.trySubscribe(() => {})).not.toBeNull();
    }
    expect(bus.trySubscribe(() => {})).toBeNull();
    expect(bus.size).toBe(MAX_REALTIME_SUBSCRIBERS);
  });
});
