import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ENV_NAMES,
  REALTIME_LANGS,
  buildClientSnippet,
  buildEnvBlock,
  buildRealtimeSnippet,
  projectChannelName,
} from "./studio-snippets.js";

/** Only real contract surface (S0084 + jord-client realtime). Anything else in a snippet is a bug. */
const FIXTURE = {
  paths: ["/p/$JORD_PROJECT/realtime", "/p/{PROJECT}/realtime"],
  frameTypes: ["ready", "subscribe", "snapshot", "subscribed", "jord.change", "resync", "error", "ping", "pong"],
  headers: ["x-jord-key", "Accept"],
  imports: ["@altr/jord-client"],
  pyImports: ["asyncio", "json", "os", "websockets"],
  sseParams: ["table", "filter", "since", "limit"],
  envNames: ["JORD_URL", "JORD_PROJECT", "JORD_PUBLISHABLE_KEY"],
};

const OPTS = { table: "notes", filter: { status: "open" } };

describe("studio snippets S0086", () => {
  for (const lang of REALTIME_LANGS) {
    it(`${lang}: only real paths, frames, headers, imports`, () => {
      const out = buildRealtimeSnippet(lang, OPTS);

      for (const m of out.matchAll(/\/p\/[^\s"'`?]*/g)) {
        assert.ok(FIXTURE.paths.includes(m[0]), `unknown path ${m[0]}`);
      }
      for (const m of out.matchAll(/["']type["']\s*:\s*["']([\w.]+)["']/g)) {
        assert.ok(FIXTURE.frameTypes.includes(m[1]!), `unknown frame ${m[1]}`);
      }
      for (const m of out.matchAll(/kind == "([\w.]+)"/g)) {
        assert.ok(FIXTURE.frameTypes.includes(m[1]!), `unknown frame ${m[1]}`);
      }
      for (const m of out.matchAll(/-H "([^:]+):/g)) assert.ok(FIXTURE.headers.includes(m[1]!), m[1]);
      for (const m of out.matchAll(/\{"([\w-]+)": KEY\}/g)) assert.ok(FIXTURE.headers.includes(m[1]!), m[1]);
      for (const m of out.matchAll(/from "([^"]+)"/g)) assert.ok(FIXTURE.imports.includes(m[1]!), m[1]);
      for (const m of out.matchAll(/^import (\w+)$/gm)) assert.ok(FIXTURE.pyImports.includes(m[1]!), m[1]);
      for (const m of out.matchAll(/--data-urlencode\s+["']?(\w+)=/g)) {
        assert.ok(FIXTURE.sseParams.includes(m[1]!), m[1]);
      }
      for (const m of out.matchAll(/\bJORD_[A-Z_]+\b/g)) assert.ok(FIXTURE.envNames.includes(m[0]), m[0]);
      for (const n of FIXTURE.envNames) assert.ok(out.includes(n), `${lang} missing ${n}`);
    });

    it(`${lang}: never leaks a secret or bearer key, includes the server-only note`, () => {
      const out = buildRealtimeSnippet(lang, { ...OPTS, publishableKey: "jord_pub_abc" });
      assert.doesNotMatch(out, /jord_sec_/);
      assert.doesNotMatch(out, /JORD_SECRET_KEY/);
      assert.doesNotMatch(out, /Authorization:\s*Bearer/i);
      assert.match(out, /secret key is server-only and is rejected by this endpoint/);
      assert.match(out, /jord_pub_abc/);
      assert.doesNotMatch(buildRealtimeSnippet(lang, OPTS), /jord_pub_/);
    });

    it(`${lang}: covers connect, subscribe, snapshot/changes/resync, unsubscribe`, () => {
      const out = buildRealtimeSnippet(lang, OPTS);
      assert.match(out, /notes/);
      assert.match(out, /snapshot/);
      assert.match(out, /resync/);
      assert.match(out, /status/);
      if (lang === "js") assert.match(out, /unsubscribe\(\)/);
      if (lang === "python") assert.match(out, /additional_headers=\{"x-jord-key": KEY\}/);
      if (lang === "curl") assert.match(out, /Ctrl\+C/);
    });
  }

  it("js documents the ?apikey= upgrade fallback and its log trade-off; others never use it", () => {
    const js = buildRealtimeSnippet("js", OPTS);
    assert.match(js, /\?apikey=/);
    assert.match(js, /logs/);
    // Outside comments, cURL and Python never put the key in the query.
    assert.doesNotMatch(buildRealtimeSnippet("curl", OPTS), /^(?!\s*#).*apikey/m);
    assert.doesNotMatch(buildRealtimeSnippet("python", OPTS), /apikey/);
  });

  it("shows a commented filter example when no filter is given", () => {
    assert.match(buildRealtimeSnippet("js", { table: "notes" }), /\/\/ filter:/);
    assert.match(buildRealtimeSnippet("python", { table: "notes" }), /# "filter"/);
  });

  it("channel name format and env var names are stable", () => {
    assert.equal(projectChannelName("demo", "public", "notes"), "p:demo:public.notes");
    assert.equal(projectChannelName("demo", "", "notes"), "p:demo:public.notes");
    assert.equal(projectChannelName("demo", "app", "t"), "p:demo:app.t");
    assert.deepEqual(ENV_NAMES, {
      url: "JORD_URL",
      project: "JORD_PROJECT",
      publishableKey: "JORD_PUBLISHABLE_KEY",
    });
  });

  it("env block and client init carry no secret key", () => {
    const env = buildEnvBlock({ url: "http://x", publishableKey: null, slug: "demo" });
    assert.match(env, /JORD_PUBLISHABLE_KEY=<publishable key>/);
    assert.match(env, /JORD_URL=http:\/\/x/);
    assert.doesNotMatch(env, /JORD_SECRET_KEY|jord_sec_/);
    assert.match(buildClientSnippet({ publishableKey: "jord_pub_abc" }), /jord_pub_abc/);
    assert.doesNotMatch(buildClientSnippet({ publishableKey: null }), /jord_sec/);
  });
});
