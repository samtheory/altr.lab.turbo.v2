import { Hono } from "hono";
import { cors } from "hono/cors";
import { readEnv } from "@altr/base/env";

const app = new Hono();
const env = readEnv();

app.use("*", cors());

app.get("/", (c) =>
  c.json({
    name: "@altr/hono-server",
    status: "ok",
    env: env.NODE_ENV,
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "hono-server",
    timestamp: new Date().toISOString(),
  }),
);

const port = Number(process.env.PORT ?? 8787);

console.log(`[@altr/hono-server] listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
