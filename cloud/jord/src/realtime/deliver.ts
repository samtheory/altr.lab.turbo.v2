import type { JordChangeEvent } from "./types.js";

type DeliveryRow = { oldJson: string | null; newJson: string | null; op: string };

/**
 * Single live-delivery decision shared by SSE and WebSocket so the two
 * transports cannot drift. Fails closed: an event whose outbox row cannot be
 * found (pruned between publish and lookup) or whose lookup/policy check
 * throws is NOT delivered. Every published event carries a seq (the bus is
 * fed only from outbox rows), so a missing row is never "legitimately
 * unfiltered".
 */
export async function liveDeliveryAllowed(input: {
  event: JordChangeEvent;
  getBySeq: (seq: number) => Promise<DeliveryRow | null>;
  allowed: (event: JordChangeEvent, row: DeliveryRow) => Promise<boolean>;
}): Promise<boolean> {
  const { event } = input;
  try {
    if (event.seq == null) return false;
    const row = await input.getBySeq(event.seq);
    if (!row) {
      console.debug(
        `[@altr/jord-server] realtime event seq=${event.seq} dropped: outbox row missing`,
      );
      return false;
    }
    return await input.allowed(event, row);
  } catch (err) {
    console.error("[@altr/jord-server] realtime delivery check failed", err);
    return false;
  }
}
