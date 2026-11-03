import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LIVE_TOGGLE_INITIAL, liveBadge, liveToggleReducer as r } from "./studio-live-toggle.js";

describe("studio live toggle S0086", () => {
  it("toggles on/off and resets the error on enable", () => {
    let s = r(LIVE_TOGGLE_INITIAL, { type: "toggle", on: true });
    assert.deepEqual(s, { on: true, conn: "connecting", error: null });
    s = r(s, { type: "open" });
    assert.equal(s.conn, "live");
    s = r(s, { type: "reconnecting" });
    assert.equal(s.conn, "reconnecting");
    s = r(s, { type: "toggle", on: false });
    assert.deepEqual(s, { on: false, conn: "off", error: null });
  });

  it("closed turns off with a dismissible banner; events while off are ignored", () => {
    let s = r({ on: true, conn: "live", error: null }, { type: "closed", message: "gone" });
    assert.deepEqual(s, { on: false, conn: "off", error: "gone" });
    assert.equal(r(s, { type: "open" }), s);
    s = r(s, { type: "dismiss" });
    assert.equal(s.error, null);
    s = r({ on: false, conn: "off", error: "gone" }, { type: "toggle", on: true });
    assert.equal(s.error, null);
  });

  it("badge labels", () => {
    assert.equal(liveBadge("live").label, "Live");
    assert.equal(liveBadge("reconnecting").tone, "warning");
  });
});
