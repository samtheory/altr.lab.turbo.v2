import { describe, expect, it } from "vitest";

import { RealtimeBus } from "./bus.js";
import {
  isRealtimeSubscribeTable,
  MAX_REALTIME_SUBSCRIBERS,
  type JordChangeEvent,
} from "./types.js";

function sample(
  partial: Partial<JordChangeEvent> & Pick<JordChangeEvent, "id" | "table">,
): JordChangeEvent {
  return {
    type: "jord.change",
    op: "insert",
    version: 1,
    at: 1,
    dialect: "libsql",
    ...partial,
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
    bus.publish(sample({ id: "a", table: "records" }));
    expect(seen).toEqual(["a"]);
  });

  it("filters by table and id", () => {
    const bus = new RealtimeBus();
    const seen: string[] = [];
    bus.trySubscribeFiltered({ table: "notes" }, (event) => {
      seen.push(`${event.table}:${event.id}`);
    });
    bus.trySubscribeFiltered({ table: "notes", id: "2" }, (event) => {
      seen.push(`id2:${event.id}`);
    });
    bus.publish(sample({ id: "1", table: "records" }));
    bus.publish(sample({ id: "1", table: "notes" }));
    bus.publish(sample({ id: "2", table: "notes", op: "update" }));
    expect(seen).toEqual(["notes:1", "notes:2", "id2:2"]);
  });

  it("returns null once the subscriber cap is reached", () => {
    const bus = new RealtimeBus();
    for (let i = 0; i < MAX_REALTIME_SUBSCRIBERS; i++) {
      expect(bus.trySubscribe(() => {})).not.toBeNull();
    }
    expect(bus.trySubscribe(() => {})).toBeNull();
    expect(bus.size).toBe(MAX_REALTIME_SUBSCRIBERS);
  });

  it("close clears subscribers and ignores publish / subscribe", () => {
    const bus = new RealtimeBus();
    const seen: string[] = [];
    bus.trySubscribe((event) => {
      seen.push(event.id);
    });
    bus.close();
    expect(bus.size).toBe(0);
    expect(bus.trySubscribe(() => {})).toBeNull();
    bus.publish(sample({ id: "after-close", table: "records" }));
    expect(seen).toEqual([]);
  });
});

describe("isRealtimeSubscribeTable", () => {
  it("allows records and user tables; rejects reserved", () => {
    expect(isRealtimeSubscribeTable("records")).toBe(true);
    expect(isRealtimeSubscribeTable("lab_notes")).toBe(true);
    expect(isRealtimeSubscribeTable("jord_policies")).toBe(false);
    expect(isRealtimeSubscribeTable("sqlite_master")).toBe(false);
    expect(isRealtimeSubscribeTable("bad-name")).toBe(false);
  });
});
