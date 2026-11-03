import { describe, expect, it } from "vitest";

import { PG_URL } from "../testing/harness.js";
import { PresenceHub, type ChannelSink } from "./channels.js";
import { createPgPeerTransport } from "./presence-pg.js";

function sock() {
  const msgs: Array<Record<string, unknown>> = [];
  const sink: ChannelSink = {
    send: (text) => msgs.push(JSON.parse(text) as Record<string, unknown>),
    close: () => undefined,
  };
  return { msgs, sink };
}

async function until(fn: () => boolean, ms = 3_000): Promise<void> {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 25));
  }
}

/** Two instances over real Postgres NOTIFY (S0083). Needs JORD_TEST_POSTGRES_URL. */
describe.skipIf(!PG_URL)("presence across two instances over Postgres NOTIFY", () => {
  it("presence and broadcast cross instances; leave propagates", async () => {
    const t1 = createPgPeerTransport({ connectionString: PG_URL });
    const t2 = createPgPeerTransport({ connectionString: PG_URL });
    await t1.start();
    await t2.start();
    const h1 = new PresenceHub({ transport: t1 });
    const h2 = new PresenceHub({ transport: t2 });
    try {
      const channel = `lab_notes:pg-${Date.now()}`;
      const a = sock();
      const b = sock();
      const ra = h1.connect(channel, a.sink);
      const rb = h2.connect(channel, b.sink);
      if (!ra.ok || !rb.ok) throw new Error("admit");
      ra.member.receive(JSON.stringify({ type: "join", state: { n: "a" } }));
      await until(() => h2.members(channel).length === 1);
      rb.member.receive(JSON.stringify({ type: "broadcast", event: "hi", payload: 1 }));
      await until(() => a.msgs.some((m) => m.type === "broadcast"));
      expect(b.msgs.some((m) => m.type === "broadcast")).toBe(false);
      ra.member.leave();
      await until(() => h2.members(channel).length === 0);
    } finally {
      h1.close();
      h2.close();
      await t1.stop();
      await t2.stop();
    }
  });
});
