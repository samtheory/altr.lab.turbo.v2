import type { RealtimeBus } from "../realtime/bus.js";

/**
 * S0095 — tiny in-process realtime counters. Attaches ONE listener to the bus
 * (so it counts toward `bus.size`; `subscribers()` subtracts it). The realtime
 * module itself is untouched.
 */
export type RealtimeCounters = {
  subscribers: () => number;
  eventsPerMin: () => number;
  /** Epoch ms of the newest event seen since attach, or null. */
  lastEventAt: () => number | null;
  /** Top-n tables by events in the last 60 s (jord_* excluded). */
  topTables: (n: number) => Array<{ table: string; events: number }>;
  dispose: () => void;
};

export const MAX_TRACKED_TABLES = 64;

export function attachRealtimeCounters(
  bus: RealtimeBus,
  now: () => number = Date.now,
): RealtimeCounters {
  // 60 one-second slots: slot[i] holds the count for the second `secs[i]`.
  const slots = new Array<number>(60).fill(0);
  const secs = new Array<number>(60).fill(-1);
  const perTable = Array.from({ length: 60 }, () => new Map<string, number>());
  let last: number | null = null;
  // table -> last second it was counted; keeps the 64-table cap check O(1) on the bus hot path.
  const lastSeen = new Map<string, number>();
  const live = (s: number, i: number) => secs[i]! > s - 60;
  const off = bus.trySubscribe((event) => {
    const t = now();
    const s = Math.floor(t / 1000);
    const i = s % 60;
    if (secs[i] !== s) {
      secs[i] = s;
      slots[i] = 0;
      perTable[i]!.clear();
    }
    slots[i]!++;
    const table = event?.table;
    if (typeof table !== "string") {
      last = t;
      return;
    }
    // Internal control-plane events count toward eventsPerMin but not lastEventAt or the table list.
    if (table.startsWith("jord_")) return;
    last = t;
    const m = perTable[i]!;
    if (!lastSeen.has(table) && lastSeen.size >= MAX_TRACKED_TABLES) {
      // Bounded: drop tables not seen in the live window, then refuse new ones while still full.
      for (const [name, sec] of lastSeen) if (sec <= s - 60) lastSeen.delete(name);
      if (lastSeen.size >= MAX_TRACKED_TABLES) return;
    }
    lastSeen.set(table, s);
    m.set(table, (m.get(table) ?? 0) + 1);
  });
  return {
    subscribers: () => Math.max(0, bus.size - (off ? 1 : 0)),
    eventsPerMin: () => {
      const s = Math.floor(now() / 1000);
      let n = 0;
      for (let i = 0; i < 60; i++) if (secs[i]! > s - 60) n += slots[i]!;
      return n;
    },
    lastEventAt: () => last,
    topTables: (n) => {
      const s = Math.floor(now() / 1000);
      const sum = new Map<string, number>();
      for (let i = 0; i < 60; i++) {
        if (!live(s, i)) continue;
        for (const [k, v] of perTable[i]!) sum.set(k, (sum.get(k) ?? 0) + v);
      }
      return [...sum]
        .filter(([k]) => !k.startsWith("jord_"))
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, Math.max(0, n))
        .map(([table, events]) => ({ table, events }));
    },
    dispose: () => off?.(),
  };
}
